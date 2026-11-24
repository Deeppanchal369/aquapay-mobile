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

export type KycOverallStatus =
  | "pending" // KYC not started or in early phases
  | "in_progress" // Started steps (e.g. Step 1 done)
  | "under_review" // All 7 steps finished, awaiting admin audit
  | "approved" // Admin approved - unlocks user creation
  | "rejected"; // Admin rejected / requested corrections

export interface UserKycRecord {
  userId: number | string;
  status: KycOverallStatus;
  completedSteps: number[]; // e.g. [1]
  currentStep: number; // e.g. 2
  step1Data?: Step1Data;
  rejectionReason?: string;
  updatedAt: string;
}

const STORAGE_KEY = "AQUAPAY_KYC_STORE_V1";

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
 * Defaults to Step 1 Pending if not previously initiated.
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
 * Saves validated Step 1 (Basic Details) for a user,
 * marks Step 1 as completed, and unlocks Step 2.
 */
export async function saveStep1Kyc(
  userId: number | string,
  data: Step1Data
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);

  const completed = Array.from(new Set([...record.completedSteps, 1]));
  const updated: UserKycRecord = {
    ...record,
    status: completed.length >= 7 ? "under_review" : "in_progress",
    completedSteps: completed,
    currentStep: 2, // Step 2 is now the active spotlight step
    step1Data: data,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Approves a user's KYC (Admin action).
 * Unlocks "Add Member" and "View My Team" for the user.
 */
export async function approveKyc(
  userId: number | string
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const updated: UserKycRecord = {
    ...record,
    status: "approved",
    rejectionReason: undefined,
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
  reason: string
): Promise<UserKycRecord> {
  const record = await getUserKyc(userId);
  const updated: UserKycRecord = {
    ...record,
    status: "rejected",
    rejectionReason: reason,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = updated;
  await persistStore();
  return updated;
}

/**
 * Resets a user's KYC record back to Step 1 (useful for testing and re-verification).
 */
export async function resetUserKyc(
  userId: number | string
): Promise<UserKycRecord> {
  const initial: UserKycRecord = {
    userId,
    status: "pending",
    completedSteps: [],
    currentStep: 1,
    step1Data: undefined,
    rejectionReason: undefined,
    updatedAt: new Date().toISOString(),
  };

  memoryCache[String(userId)] = initial;
  await persistStore();
  return initial;
}

/**
 * Retrieves all stored KYC records (for Admin queue / phase tracker).
 */
export async function getAllKycRecords(): Promise<
  Record<string, UserKycRecord>
> {
  return await loadStore();
}
