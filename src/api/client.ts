import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

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
