
import bcrypt from "bcryptjs";
import pool from "../../../config/db.js";
import userModel from "../user.model.js";
import ApiError from "../../../utils/ApiError.js";
import httpStatus from "../../../utils/httpStatus.js";
import { getPasswordConfig } from "../../../config/auth.js";

async function updateUser({ actorId, targetUserId, fields }) {
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

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Fetch the authenticated actor from the database.
    const actor = await userModel.findUserForAuth(actorId, connection);

    if (!actor) {
      throw new ApiError(
        httpStatus.UNAUTHORIZED,
        "Active authenticated user not found",
        [],
        "UNAUTHORIZED",
      );
    }

    // 2. Only role ID 1 (Admin) may use this endpoint.
    if (Number(actor.role_id) !== 1) {
      throw new ApiError(
        httpStatus.FORBIDDEN,
        "Only administrators can update users",
        [],
        "FORBIDDEN",
      );
    }

    // 3. Ensure the target user exists.
    const currentUser = await userModel.findUserSafeById(
      targetId,
      connection,
    );

    if (!currentUser) {
      throw new ApiError(
        httpStatus.NOT_FOUND,
        "User not found",
        [],
        "NOT_FOUND",
      );
    }

    // 4. Handle email and mobile changes: remove if unchanged from current values
    if (fields.email !== undefined) {
      const newEmail = fields.email.trim().toLowerCase();
      const currentEmail = String(currentUser.email || "")
        .trim()
        .toLowerCase();

      if (newEmail === currentEmail) {
        delete fields.email;
      }
    }

    if (fields.mobile !== undefined) {
      const newMobile = String(fields.mobile).trim();
      const currentMobile = String(currentUser.mobile || "").trim();

      if (newMobile === currentMobile) {
        delete fields.mobile;
      }
    }

    // 5. Check email and mobile uniqueness if either was changed, excluding this user.
    if (fields.email !== undefined || fields.mobile !== undefined) {
      const duplicate = await userModel.checkDuplicateUser(
        {
          email: fields.email || null,
          mobile: fields.mobile || null,
          excludeUserId: targetId,
        },
        connection,
      );

      if (duplicate) {
        const emailDuplicate =
          fields.email &&
          duplicate.email?.toLowerCase() === fields.email.toLowerCase();

        throw new ApiError(
          httpStatus.CONFLICT,
          emailDuplicate
            ? "Email already belongs to another user"
            : "Mobile number already belongs to another user",
          [],
          "DUPLICATE_ENTRY",
        );
      }
    }

    // 6. If password was supplied, hash and update password_hash
    const fieldsToUpdate = { ...fields };
    if (fieldsToUpdate.password) {
      const passwordConfig = getPasswordConfig();
      const passwordHash = await bcrypt.hash(fieldsToUpdate.password, passwordConfig.bcryptSaltRounds);
      delete fieldsToUpdate.password;
      await connection.execute("UPDATE users SET password_hash = ? WHERE id = ?", [passwordHash, targetId]);
    }

    // Update other fields supplied by the administrator
    if (Object.keys(fieldsToUpdate).length > 0) {
      await userModel.updateUserFields(targetId, fieldsToUpdate, connection);
    }

    // 7. Fetch a safe profile for the response.
    const updatedUser = await userModel.findUserSafeById(
      targetId,
      connection,
    );

    await connection.commit();
    connection.release();
    return updatedUser;

} catch (error) {
  let rollbackFailed = false;

  try {
    await connection.rollback();
  } catch {
    rollbackFailed = true;
  }

  if (rollbackFailed) {
    connection.destroy();
  } else {
    connection.release();
  }

  if (error?.code === "ER_DUP_ENTRY") {
    throw new ApiError(
      httpStatus.CONFLICT,
      "Email or mobile number already belongs to another user",
      [],
      "DUPLICATE_ENTRY",
    );
  }

  throw error;
  }
}

export { updateUser };
export default { updateUser };
