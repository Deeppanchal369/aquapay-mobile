import { api } from "./client";

export interface RoleItem {
  id: number;
  name: string;
  slug: string;
}

export interface UserItem {
  id: number;
  name: string;
  email: string;
  mobile: string;
  shopname?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  status: "active" | "inactive" | "blocked";
  role_id: number;
  role_name: string;
  role_slug: string;
  company_id?: number | null;
  company_name?: string | null;
  parent_id?: number | null;
  parent_name?: string | null;
  kyc?: {
    status: string;
    steps_completed: number;
    business_type?: string | null;
  } | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserInput {
  name: string;
  email: string;
  mobile: string;
  password?: string;
  roleId: number;
  shopname?: string;
  address?: string;
  state?: string;
  city?: string;
  pincode?: string;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  mobile?: string;
  password?: string;
  shopname?: string | null;
  address?: string | null;
  state?: string | null;
  city?: string | null;
  pincode?: string | null;
  status?: "active" | "inactive" | "blocked";
}

export interface CheckAvailabilityResult {
  available: boolean;
  field?: "mobile" | "email";
  message: string;
}

export async function checkAvailability(params: {
  mobile?: string;
  email?: string;
}): Promise<CheckAvailabilityResult> {
  const res = await api.get("/api/users/check-availability", { params });
  return res.data?.data;
}

export async function fetchDescendantRoles(): Promise<RoleItem[]> {
  const res = await api.get("/api/users/roles/descendants");
  return res.data?.data || [];
}

export async function fetchUsers(params?: {
  search?: string;
  roleId?: number;
}): Promise<UserItem[]> {
  const res = await api.get("/api/users", { params });
  return res.data?.data || [];
}

export async function fetchUserById(id: number): Promise<UserItem> {
  const res = await api.get(`/api/users/${id}`);
  return res.data?.data;
}

export async function createUser(input: CreateUserInput): Promise<UserItem> {
  const res = await api.post("/api/users", input);
  return res.data?.data;
}

export async function updateUser(
  id: number,
  input: UpdateUserInput,
): Promise<UserItem> {
  const res = await api.patch(`/api/users/${id}`, input);
  return res.data?.data;
}

export async function deleteUser(id: number): Promise<{ id: number; action: string; message: string }> {
  const res = await api.delete(`/api/users/${id}`);
  return res.data?.data;
}
