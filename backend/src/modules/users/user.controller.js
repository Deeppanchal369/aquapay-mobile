import userService from "./user.service.js";
import asyncHandler from "../../utils/asyncHandler.js";
import ApiResponse from "../../utils/ApiResponse.js";
import ApiError from "../../utils/ApiError.js";
import httpStatus from "../../utils/httpStatus.js";

function getActorId(req) {
  const actorId = req.user?.id;

  if (!actorId) {
    throw new ApiError(
      httpStatus.UNAUTHORIZED,
      "Authentication required",
      [],
      "UNAUTHORIZED",
    );
  }

  return Number(actorId);
}

const createUser = asyncHandler(async (req, res) => {
  const actorId = getActorId(req);
  const {
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
  } = req.validatedBody || req.body;

  const result = await userService.createUser({
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
  });

  return res
    .status(httpStatus.CREATED)
    .json(
      new ApiResponse(httpStatus.CREATED, result, "User created successfully"),
    );
});

const deleteUser = asyncHandler(async (req, res) => {
  const actorId = getActorId(req);
  const targetUserId = req.params.id;

  const result = await userService.deleteUser({
    actorId,
    targetUserId,
  });

  return res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, result, result.message || "User deleted successfully"),
  );
});

const checkAvailability = asyncHandler(async (req, res) => {
  const { mobile, email } = req.query;
  const result = await userService.checkAvailability({ mobile, email });
  return res.status(httpStatus.OK).json(
    new ApiResponse(httpStatus.OK, result, result.message),
  );
});

export { createUser, deleteUser, checkAvailability };
export default { createUser, deleteUser, checkAvailability };
