import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

type AuthExpiredHandler = () => void;
let authExpiredHandler: AuthExpiredHandler | null = null;

export function setOnAuthExpired(handler: AuthExpiredHandler | null) {
  authExpiredHandler = handler;
}

// eslint-disable-next-line import/no-named-as-default-member
export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL || "http://192.168.1.8:8000",
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(async (config) => {
  try {
    let token: string | null = null;
    if (Platform.OS === "web") {
      token =
        typeof window !== "undefined"
          ? window.localStorage.getItem("token")
          : null;
    } else {
      token = await SecureStore.getItemAsync("token");
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore secure store read issues during early boot
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error?.response?.status === 401) {
      const url = error.config?.url || "";
      const isLoginOrAuthCheck =
        url.includes("/api/auth/login") || url.includes("/api/auth/forgot-password");

      if (!isLoginOrAuthCheck) {
        try {
          if (Platform.OS === "web") {
            if (typeof window !== "undefined") {
              window.localStorage.removeItem("token");
            }
          } else {
            await SecureStore.deleteItemAsync("token");
          }
        } catch {
          // ignore
        }

        delete api.defaults.headers.common.Authorization;

        if (authExpiredHandler) {
          authExpiredHandler();
        }
      }
    }
    return Promise.reject(error);
  }
);
