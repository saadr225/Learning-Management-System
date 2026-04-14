import axios from "axios";

const BASE_URL = "http://localhost:5001/auth";

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token?: string;
  user: AuthUser;
  message: string;
}

export async function registerUser(
  email: string,
  password: string,
  role: string = "user"
): Promise<AuthResponse> {
  const { data } = await axios.post<AuthResponse>(`${BASE_URL}/register`, {
    email,
    password,
    role,
  });
  return data;
}

export async function loginUser(
  email: string,
  password: string
): Promise<AuthResponse> {
  const { data } = await axios.post<AuthResponse>(`${BASE_URL}/login`, {
    email,
    password,
  });
  return data;
}

export async function getMe(token: string): Promise<AuthUser> {
  const { data } = await axios.get<AuthUser>(`${BASE_URL}/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

export async function refreshToken(refreshToken: string): Promise<string> {
  const { data } = await axios.post<{ access_token: string }>(
    `${BASE_URL}/refresh`,
    { refresh_token: refreshToken }
  );
  return data.access_token;
}