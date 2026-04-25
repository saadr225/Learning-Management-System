import axios from "axios";
import { Video } from "./videos";

const BASE_URL = "http://localhost:5003/watchlist";

export interface WatchlistEntry {
  id: string;
  user_id: string;
  video_id: string;
  added_at: string;
  video: Video | null;
}

export interface WatchlistResponse {
  watchlist: WatchlistEntry[];
  total: number;
}

function authHeader(): Record<string, string> {
  const token = localStorage.getItem("access_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function getWatchlist(): Promise<WatchlistResponse> {
  const { data } = await axios.get<WatchlistResponse>(BASE_URL, {
    headers: authHeader(),
  });
  return data;
}

export async function addToWatchlist(video_id: string): Promise<void> {
  await axios.post(BASE_URL, { video_id }, { headers: authHeader() });
}

export async function removeFromWatchlist(video_id: string): Promise<void> {
  await axios.delete(`${BASE_URL}/${video_id}`, { headers: authHeader() });
}

export async function checkInWatchlist(video_id: string): Promise<boolean> {
  const { data } = await axios.get<{ in_watchlist: boolean }>(
    `${BASE_URL}/check/${video_id}`,
    { headers: authHeader() }
  );
  return data.in_watchlist;
}