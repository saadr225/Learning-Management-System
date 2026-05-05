import axios from "axios";

const BASE_URL = "/api/videos";

export interface Video {
  id: string;
  title: string;
  description: string;
  tags: string[];
  uploader_id: string;
  duration_seconds: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface VideoListResponse {
  videos: Video[];
  total: number;
  page: number;
  limit: number;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function listVideos(params?: {
  tag?: string;
  search?: string;
  page?: number;
  limit?: number;
}): Promise<VideoListResponse> {
  const { data } = await axios.get<VideoListResponse>(BASE_URL, { params });
  return data;
}

export async function getVideo(id: string): Promise<Video> {
  const { data } = await axios.get<Video>(`${BASE_URL}/${id}`);
  return data;
}

export async function getStreamUrl(id: string): Promise<string> {
  const { data } = await axios.get<{ stream_url: string }>(
    `${BASE_URL}/${id}/stream-url`,
    { headers: authHeader() }
  );
  return data.stream_url;
}

export function formatDuration(seconds: number): string {
  if (!seconds) return "Unknown";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}