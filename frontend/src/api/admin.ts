import axios from "axios";
import { Video } from "./videos";

const BASE = "http://localhost:5004/admin";

function authHeader() {
  const t = localStorage.getItem("access_token");
  return t ? { Authorization: `Bearer ${t}` } : {};
}

export interface DashboardStats {
  users: number;
  videos_total: number;
  videos_published: number;
  videos_draft: number;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  created_at: string;
}

export interface AdminVideoRow extends Video {
  has_video_file: boolean;
}

export async function getDashboard(): Promise<DashboardStats> {
  const { data } = await axios.get<DashboardStats>(`${BASE}/dashboard`, {
    headers: authHeader(),
  });
  return data;
}

export async function listAdminUsers(): Promise<AdminUserRow[]> {
  const { data } = await axios.get<{ users: AdminUserRow[] }>(`${BASE}/users`, {
    headers: authHeader(),
  });
  return data.users;
}

export async function listAdminVideos(): Promise<AdminVideoRow[]> {
  const { data } = await axios.get<{ videos: AdminVideoRow[] }>(`${BASE}/videos`, {
    headers: authHeader(),
  });
  return data.videos;
}

export async function adminCreateVideo(body: {
  title: string;
  description: string;
  tags: string[];
}): Promise<{ video: AdminVideoRow }> {
  const { data } = await axios.post(`${BASE}/videos`, body, { headers: authHeader() });
  return data;
}

export async function adminPatchVideo(
  id: string,
  body: Partial<{ is_published: boolean; duration_seconds: number; title: string; description: string; tags: string[] }>
) {
  const { data } = await axios.patch(`${BASE}/videos/${id}`, body, { headers: authHeader() });
  return data;
}

export async function adminDeleteVideo(id: string) {
  await axios.delete(`${BASE}/videos/${id}`, { headers: authHeader() });
}

export async function adminGetUploadUrl(
  id: string,
  content_type = "video/mp4"
): Promise<{ upload_url: string; s3_key: string; instructions?: string }> {
  const { data } = await axios.post(
    `${BASE}/videos/${id}/upload-url`,
    { content_type },
    { headers: authHeader() }
  );
  return data;
}

/** Upload file to S3 using presigned PUT (browser must match Content-Type). */
export async function uploadFileToS3(uploadUrl: string, file: File, contentType: string) {
  const res = await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": contentType },
  });
  if (!res.ok) throw new Error(`S3 upload failed: ${res.status}`);
}