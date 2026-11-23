import { api } from "./client";

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  mobile: string;
  shopname?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  role_id: number;
  company_id?: number | null;
  parent_id?: number | null;
  status: string;
  role_name: string;
  company_name?: string | null;
  parent_name?: string | null;
  created_at?: string;
  kyc?: {
    status: string;
    steps_completed?: number;
    business_type?: string | null;
    completedSteps?: number[];
    currentStep?: number | null;
  } | null;
}

export interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  data?: {
    resetToken?: string;
  } | null;
}

export interface ResetPasswordInput {
  token: string;
  otp: string;
  password: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function requestPasswordReset(
  identifier: string
): Promise<ForgotPasswordResponse> {
  const res = await api.post("/api/auth/forgot-password", {
    identifier: identifier.trim(),
  });
  return res.data;
}

export async function resetPassword(
  input: ResetPasswordInput
): Promise<{ success: boolean; message: string }> {
  const res = await api.post("/api/auth/reset-password", {
    token: input.token.trim(),
    otp: input.otp.trim(),
    password: input.password,
  });
  return res.data;
}

export async function changePassword(
  input: ChangePasswordInput
): Promise<{ success: boolean; message: string }> {
  const res = await api.post("/api/auth/change-password", {
    currentPassword: input.currentPassword,
    newPassword: input.newPassword,
    confirmPassword: input.confirmPassword,
  });
  return res.data;
}

export async function fetchMyProfile(): Promise<UserProfile> {
  const res = await api.get("/api/auth/me");
  return res.data?.data;
}
