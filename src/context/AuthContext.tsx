import React, { createContext, useContext, useEffect, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { api, setOnAuthExpired } from "../api/client";

export type User = {
  id?: number | string;
  name?: string;
  email?: string;
  mobile?: string;
  shopname?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
  role: string;
  role_id?: number;
  role_name?: string;
  company_id?: number;
  company_name?: string;
  parent_id?: number;
  parent_name?: string;
  status?: string;
  created_at?: string;
  kyc?: {
    status?: string;
    steps_completed?: number;
    business_type?: string | null;
    completedSteps?: number[];
    currentStep?: number | null;
  } | null;
};

type AuthContextType = {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<User | null>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {
    throw new Error("AuthProvider not mounted");
  },
  logout: async () => {},
  refreshProfile: async () => null,
});

export const useAuth = () => useContext(AuthContext);

async function storeToken(token: string) {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.setItem("token", token);
  } else {
    await SecureStore.setItemAsync("token", token);
  }
}

async function retrieveToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
  }
  return await SecureStore.getItemAsync("token");
}

async function clearToken() {
  if (Platform.OS === "web") {
    if (typeof window !== "undefined") window.localStorage.removeItem("token");
  } else {
    await SecureStore.deleteItemAsync("token");
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (): Promise<User> => {
    const res = await api.get("/api/auth/me");
    const data = res.data?.data ?? res.data?.user ?? res.data;

    const rawRole = data.role_name ?? data.role ?? (data.role_id === 1 ? "admin" : "user");
    const role = String(rawRole).trim().toLowerCase();

    const currentUser: User = {
      ...data,
      role,
      role_id: data.role_id,
      role_name: data.role_name || rawRole,
    };

    setUser(currentUser);
    return currentUser;
  };

  useEffect(() => {
    setOnAuthExpired(() => {
      setUser(null);
    });
    return () => {
      setOnAuthExpired(null);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const token = await retrieveToken();
        if (token) {
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
          if (isMounted) {
            await loadProfile();
          }
        }
      } catch {
        await clearToken();
        delete api.defaults.headers.common.Authorization;
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  const login = async (identifier: string, password: string): Promise<User> => {
    const res = await api.post("/api/auth/login", { identifier, password });
    const token =
      res.data?.data?.accessToken ??
      res.data?.accessToken ??
      res.data?.token ??
      res.data?.data?.token;

    if (!token) {
      throw new Error("No authentication token returned by the server");
    }

    await storeToken(token);
    api.defaults.headers.common.Authorization = `Bearer ${token}`;

    const profile = await loadProfile();
    return profile;
  };

  const logout = async () => {
    await clearToken();
    delete api.defaults.headers.common.Authorization;
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshProfile: loadProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
