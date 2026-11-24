import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export interface Step1Data {
  fullName: string;
  shopName: string;
  entityType: string;
  category: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  submittedAt: string;
}

export interface Step2Data {
  aadhaarNumber: string; // masked
  verified: boolean;
  submittedAt: string;
}

export interface Step3Data {
  panNumber: string;
  dob: string;
  verified: boolean;
  submittedAt: string;
}

export interface Step4Data {
  accountNumber: string; // masked
  ifscCode: string;
  bankName: string;
  accountHolderName: string;
  submittedAt: string;
}

export interface Step5Data {
  selfieImage: string;
  shopFrontImage: string;
  submittedAt: string;
}

export interface Step6Data {
  termsAccepted: boolean;
  declarationAccepted: boolean;
  submittedAt: string;
}

export interface Step7Data {
  submittedForReviewAt: string;
}

export type KycOverallStatus =
  | "pending" // KYC not started or in progress (steps 1-6)
  | "under_review" // All 7 steps submitted, awaiting admin audit
  | "approved" // Admin approved - unlocks user creation
  | "rejected"; // Admin rejected / requested corrections

export interface UserKycRecord {
  userId: number | string;
  status: KycOverallStatus;
  completedSteps: number[]; // e.g. [1, 2, 3, 4, 5, 6, 7]
  currentStep: number;
  step1Data?: Step1Data;
  step2Data?: Step2Data;
  step3Data?: Step3Data;
  step4Data?: Step4Data;
  step5Data?: Step5Data;
  step6Data?: Step6Data;
  step7Data?: Step7Data;
  rejectionReason?: string;
  rejectedStep?: number;
  updatedAt: string;
}

const STORAGE_KEY = "AQUAPAY_KYC_STORE_V2";

// In-memory cache for fast, synchronous reads and fallback
const memoryCache: Record<string, UserKycRecord> = {};
let isStoreLoaded = false;

async function loadStore(): Promise<Record<string, UserKycRecord>> {
  if (isStoreLoaded) return memoryCache;
  try {
    let raw: string | null = null;
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        raw = window.localStorage.getItem(STORAGE_KEY);
      }
    } else {
      raw = await SecureStore.getItemAsync(STORAGE_KEY);
    }

    if (raw) {
      const parsed = JSON.parse(raw);
      Object.assign(memoryCache, parsed);
    }
  } catch {
    // quiet fallback
  }
  isStoreLoaded = true;
  return memoryCache;
}

async function persistStore(): Promise<void> {
  try {
    const raw = JSON.stringify(memoryCache);
    if (Platform.OS === "web") {
      if (typeof window !== "undefined") {
        window.localStorage.setItem(STORAGE_KEY, raw);
      }
    } else {
      await SecureStore.setItemAsync(STORAGE_KEY, raw);
    }
  } catch {
    // quiet fallback
  }
}

/**
 * Retrieves the KYC record for a specific user ID.
 */
export async function getUserKyc(
  userId: number | string
): Promise<UserKycRecord> {
  const store = await loadStore();
  const key = String(userId);

  if (store[key]) {
    return store[key];
  }

  // Initial fresh record
  const initial: UserKycRecord = {
    userId,
    status: "pending",
    completedSteps: [],
    currentStep: 1,
    updatedAt: new Date().toISOString(),
  };

  store[key] = initial;
  await persistStore();
  return initial;
}

/**
 * Saves Step 1 data and unlocks Step 2.
 */
export async function saveStep1Kyc(
  userId: number | string,
  data: Step1Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 1]));

  const updated: UserKycRecord = {
    ...record,
    completedSteps: completed,
    currentStep: Math.max(record.currentStep, 2),
    step1Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Saves Step 2 (Aadhaar Auth) and unlocks Step 3.
 */
export async function saveStep2Kyc(
  userId: number | string,
  data: Step2Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 2]));

  const updated: UserKycRecord = {
    ...record,
    completedSteps: completed,
    currentStep: Math.max(record.currentStep, 3),
    step2Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Saves Step 3 (PAN Verification) and unlocks Step 4.
 */
export async function saveStep3Kyc(
  userId: number | string,
  data: Step3Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 3]));

  const updated: UserKycRecord = {
    ...record,
    completedSteps: completed,
    currentStep: Math.max(record.currentStep, 4),
    step3Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Saves Step 4 (Bank Account) and unlocks Step 5.
 */
export async function saveStep4Kyc(
  userId: number | string,
  data: Step4Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 4]));

  const updated: UserKycRecord = {
    ...record,
    completedSteps: completed,
    currentStep: Math.max(record.currentStep, 5),
    step4Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Saves Step 5 (Photos & Media) and unlocks Step 6.
 */
export async function saveStep5Kyc(
  userId: number | string,
  data: Step5Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 5]));

  const updated: UserKycRecord = {
    ...record,
    completedSteps: completed,
    currentStep: Math.max(record.currentStep, 6),
    step5Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Saves Step 6 (Agreements & Declarations) and unlocks Step 7.
 */
export async function saveStep6Kyc(
  userId: number | string,
  data: Step6Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 6]));

  const updated: UserKycRecord = {
    ...record,
    completedSteps: completed,
    currentStep: 7,
    step6Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Submits all 7 steps for Admin Review.
 */
export async function submitKycForReview(
  userId: number | string
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const completed = Array.from(new Set([...record.completedSteps, 7]));

  const updated: UserKycRecord = {
    ...record,
    status: "under_review",
    completedSteps: completed,
    currentStep: 7,
    step7Data: {
      submittedForReviewAt: new Date().toISOString(),
    },
    rejectionReason: undefined,
    rejectedStep: undefined,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Approves a user's KYC (Admin action).
 */
export async function approveKyc(
  userId: number | string
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const updated: UserKycRecord = {
    ...record,
    status: "approved",
    rejectionReason: undefined,
    rejectedStep: undefined,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Rejects or requests changes for a user's KYC (Admin action).
 */
export async function rejectKyc(
  userId: number | string,
  reason: string,
  rejectedStep?: number
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const updated: UserKycRecord = {
    ...record,
    status: "rejected",
    rejectionReason: reason,
    rejectedStep: rejectedStep,
    currentStep: rejectedStep || record.currentStep || 1,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Resets a user's KYC record back to Step 1.
 */
export async function resetUserKyc(
  userId: number | string
): Promise<UserKycRecord> {
  const initial: UserKycRecord = {
    userId,
    status: "pending",
    completedSteps: [],
    currentStep: 1,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = initial;
  await persistStore();
  return initial;
}

/**
 * Retrieves all stored KYC records.
 */
export async function getAllKycRecords(): Promise<
  Record<string, UserKycRecord>
> {
  return await loadStore();
}
