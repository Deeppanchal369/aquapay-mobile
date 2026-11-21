import bcrypt from "bcryptjs";
import pool from "../../config/db.js";
import userModel from "./user.model.js";
import ApiError from "../../utils/ApiError.js";
import httpStatus from "../../utils/httpStatus.js";
import authorizationService from "../authorization/authorization.service.js";
import { normalizeMobile } from "../../utils/validationHelper.js";
import { getPasswordConfig } from "../../config/auth.js";

async function createUser({
  actorId,
  name,
  email,
  mobile,
  shopname,
  address,
  state,
  city,
  pincode,
  password,
  roleId,
}) {
  if (!actorId) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Authentication required to create a user",
      [],
      "UNAUTHORIZED",
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Authenticate requester and fetch creator context
    const actor = await userModel.findUserForAuth(actorId, connection);
    if (!actor) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Active authenticated creator not found",
        [],
        "UNAUTHORIZED",
      );
    }

    // 2. Validate and resolve target child role
    const targetRole = await userModel.findRoleByIdOrName(roleId, connection);
    if (!targetRole) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        "Requested role does not exist",
        [],
        "INVALID_ROLE",
      );
    }

    // 3. Verify whether the actor can create the target role.
    const isPermitted = await authorizationService.canCreateRole(
      actor.role_id,
      targetRole.id,
      connection,
    );
    if (!isPermitted) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        `Role '${actor.role_name}' is not authorized to create a '${targetRole.name}'`,
        [],
        "FORBIDDEN",
      );
    }

    // 4. Normalize mobile and email, and check whether duplicate already exists
    const normalizedMobile = normalizeMobile(mobile);
    const normalizedEmail = email ? email.trim().toLowerCase() : email;

    const duplicate = await userModel.checkDuplicateUser(
      { email: normalizedEmail, mobile: normalizedMobile },
      connection,
    );

    if (duplicate) {
      const field = duplicate.email === normalizedEmail ? "Email" : "Mobile number";
      throw new ApiError(
        httpStatus.CONFLICT,
        `${field} already exists`,
        [],
        "DUPLICATE_ENTRY",
      );
    }

    // 5. Validate and hash password before storing
    // Admin (role_id 1) can set a custom password or leave it empty to default to mobile.
    // Non-admin creators cannot set passwords; it always defaults to the verified mobile number.
    let rawPassword = normalizedMobile;
    if (Number(actor.role_id) === 1 && typeof password === "string" && password.trim()) {
      rawPassword = password.trim();
    }

    const passwordConfig = getPasswordConfig();
    if (
      typeof rawPassword !== "string" ||
      rawPassword.length < passwordConfig.passwordMinLength ||
      Buffer.byteLength(rawPassword, "utf8") > 72
    ) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        typeof rawPassword !== "string" || !rawPassword
          ? "Password or valid mobile number is required"
          : rawPassword.length < passwordConfig.passwordMinLength
            ? `Password must contain at least ${passwordConfig.passwordMinLength} characters`
            : "Password must not exceed 72 bytes",
        [],
        "VALIDATION_ERROR",
      );
    }
    const passwordHash = await bcrypt.hash(rawPassword, passwordConfig.bcryptSaltRounds);

    // 6. Parent ID is the authenticated creator
    const parentId = actor.id;
    const companyId = actor.company_id || null;

    // 7. Insert the user using the approved database schema
    const newUserId = await userModel.insertUser(
      {
        name,
        email: normalizedEmail,
        mobile: normalizedMobile,
        shopname: shopname || null,
        address: address || null,
        state: state || null,
        city: city || null,
        pincode: pincode || null,
        passwordHash,
        roleId: targetRole.id,
        companyId,
        parentId,
        status: "active",
      },
      connection,
    );

    // 8. Initialize Phase 2 KYC Case for non-admin accounts
    if (targetRole.id !== 1) {
      await userModel.initKycCaseForUser(
        {
          userId: newUserId,
          actorId: actor.id,
        },
        connection,
      );
    }

    // 9. Fetch the created user without password or password_hash
    const newUser = await userModel.findUserSafeById(newUserId, connection);

    // 10. Commit transaction
    await connection.commit();

    return newUser;
  } catch (error) {
    try {
      await connection.rollback();
    } catch (rollbackError) {
      // Preserve the original error if rollback also fails.
    }

    if (error.code === "ER_DUP_ENTRY") {
      throw new ApiError(
        httpStatus.CONFLICT,
        "An account with this email or mobile already exists",
        [],
        "DUPLICATE_ENTRY",
      );
    }

    throw error;
  } finally {
    connection.release();
  }
}

async function deleteUser({ actorId, targetUserId }) {
  if (!actorId) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Authentication required",
      [],
      "UNAUTHORIZED",
    );
  }

  const targetId = Number(targetUserId);
  if (!Number.isSafeInteger(targetId) || targetId <= 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Invalid user ID",
      [],
      "VALIDATION_ERROR",
    );
  }

  if (Number(actorId) === targetId) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Administrators cannot delete their own account",
      [],
      "VALIDATION_ERROR",
    );
  }

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const actor = await userModel.findUserForAuth(actorId, connection);
    if (!actor || Number(actor.role_id) !== 1) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Only administrators can delete or deactivate users",
        [],
        "FORBIDDEN",
      );
    }

    const targetUser = await userModel.findUserSafeById(targetId, connection);
    if (!targetUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "User not found",
        [],
        "NOT_FOUND",
      );
    }

    if (Number(targetUser.role_id) === 1) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Primary administrator account cannot be deleted",
        [],
        "FORBIDDEN",
      );
    }

    let action = "deleted";
    try {
      const [delResult] = await connection.execute("DELETE FROM users WHERE id = ?", [targetId]);
      if (delResult.affectedRows === 0) {
        throw new ApiError(httpStatus.NOT_FOUND, "User not found", [], "NOT_FOUND");
      }
    } catch (dbErr) {
      if (dbErr.code === "ER_ROW_IS_REFERENCED_2" || dbErr.code === "ER_ROW_IS_REFERENCED") {
        await connection.execute("UPDATE users SET status = 'blocked' WHERE id = ?", [targetId]);
        action = "blocked";
      } else {
        throw dbErr;
      }
    }

    await connection.commit();
    return {
      id: targetId,
      action,
      message: action === "deleted" ? "User permanently removed" : "User deactivated and blocked",
    };
  } catch (error) {
    try {
      await connection.rollback();
    } catch {}
    throw error;
  } finally {
    connection.release();
  }
}

async function checkAvailability({ mobile, email }) {
  const normalizedMobile = mobile ? normalizeMobile(mobile) : null;
  const normalizedEmail = email ? String(email).trim().toLowerCase() : null;

  if (!normalizedMobile && !normalizedEmail) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Mobile number or email is required to verify availability",
      [],
      "VALIDATION_ERROR",
    );
  }

  const duplicate = await userModel.checkDuplicateUser({
    email: normalizedEmail,
    mobile: normalizedMobile,
  });

  if (duplicate) {
    const isMobileMatch =
      normalizedMobile && String(duplicate.mobile) === String(normalizedMobile);
    return {
      available: false,
      field: isMobileMatch ? "mobile" : "email",
      message: isMobileMatch
        ? "This mobile number is already registered"
        : "This email address is already registered",
    };
  }

  return {
    available: true,
    message: "Identifier is available",
  };
}

const userService = {
  createUser,
  deleteUser,
  checkAvailability,
};

export {
  createUser,
  deleteUser,
  checkAvailability,
};

export default userService;
