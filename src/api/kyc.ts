import { api } from "./client";

export interface BasicDetailsPayload {
  businessType: "Sole Proprietorship" | "Private Limited Company" | "Partnership / LLP";
  shopAddress: string;
}

export interface DigiLockerInitiateResponse {
  sessionId: string;
  authorizationUrl: string;
  status: string;
  expiresIn?: number;
}

export interface DigiLockerStatusResponse {
  sessionId?: string;
  status: string;
  verified?: boolean;
  maskedIdentifier?: string;
  verifiedName?: string;
  [key: string]: any;
}

/**
 * Saves Step 1 basic details (businessType & shopAddress) to backend DB.
 */
export async function saveBasicDetailsApi(payload: BasicDetailsPayload) {
  const res = await api.put("/api/kyc/basic-details", payload);
  return res.data;
}

/**
 * Requests a 6-digit OTP stored in backend Redis (aquapay:kyc:step1).
 * Note: Request body must be empty per backend validator.
 */
export async function requestStep1OtpApi() {
  const res = await api.post("/api/kyc/basic-details/request-otp");
  return res.data;
}

/**
 * Verifies the 6-digit OTP against backend Redis.
 */
export async function verifyStep1OtpApi(otp: string) {
  const res = await api.post("/api/kyc/basic-details/verify-otp", { otp });
  return res.data;
}

/**
 * Initiates DigiLocker Aadhaar authorization with explicit consent.
 */
export async function initiateDigilockerAadhaarApi(): Promise<DigiLockerInitiateResponse> {
  const res = await api.post("/api/kyc/digilocker/aadhaar/initiate", {
    consent: true,
  });
  return res.data?.data || res.data;
}

/**
 * Checks DigiLocker Aadhaar verification session status.
 */
export async function getDigilockerAadhaarStatusApi(
  sessionId?: string
): Promise<DigiLockerStatusResponse> {
  const res = await api.get("/api/kyc/digilocker/aadhaar/status/", {
    params: sessionId ? { sessionId } : undefined,
  });
  return res.data?.data || res.data;
}
