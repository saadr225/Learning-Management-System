import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import { getWatchlist, removeFromWatchlist, WatchlistEntry } from "../api/watchlist";
import { formatDuration } from "../api/videos";

export default function WatchlistPage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    getWatchlist()
      .then((data) => setEntries(data.watchlist))
      .catch(() => setError("Failed to load watchlist."))
      .finally(() => setLoading(false));
  }, []);

  async function handleRemove(video_id: string) {
    setRemoving(video_id);
    try {
      await removeFromWatchlist(video_id);
      setEntries((prev) => prev.filter((e) => e.video_id !== video_id));
    } catch {
      alert("Failed to remove. Please try again.");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div style={styles.page}>
      <Navbar />
      <div style={styles.content}>
        <h1 style={styles.heading}>My Watchlist</h1>

        {loading && <p style={styles.status}>Loading...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && !error && entries.length === 0 && (
          <div style={styles.emptyBox}>
            <p style={styles.emptyText}>Your watchlist is empty.</p>
            <button onClick={() => navigate("/library")} style={styles.browseBtn}>
              Browse Videos
            </button>
          </div>
        )}

        <div style={styles.list}>
          {entries.map((entry) => {
            const video = entry.video;
            if (!video) return null; // video was deleted

            return (
              <div key={entry.id} style={styles.row}>
                {/* Thumbnail */}
                <div
                  style={styles.thumbnail}
                  onClick={() => navigate(`/player/${video.id}`)}
                >
                  <span style={styles.playIcon}>▶</span>
                </div>

                {/* Info */}
                <div style={styles.info}>
                  <h3
                    style={styles.title}
                    onClick={() => navigate(`/player/${video.id}`)}
                  >
                    {video.title}
                  </h3>
                  <p style={styles.description}>
                    {video.description.length > 100
                      ? video.description.slice(0, 100) + "..."
                      : video.description}
                  </p>
                  <div style={styles.meta}>
                    <span style={styles.duration}>
                      ⏱ {formatDuration(video.duration_seconds)}
                    </span>
                    <span style={styles.addedAt}>
                      Added {new Date(entry.added_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={styles.actions}>
                  <button
                    style={styles.watchBtn}
                    onClick={() => navigate(`/player/${video.id}`)}
                  >
                    Watch
                  </button>
                  <button
                    style={styles.removeBtn}
                    disabled={removing === video.id}
                    onClick={() => handleRemove(video.id)}
                  >
                    {removing === video.id ? "..." : "Remove"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f8fafc" },
  content: { maxWidth: "900px", margin: "0 auto", padding: "2rem" },
  heading: { fontSize: "1.75rem", color: "#0f172a", marginBottom: "2rem" },
  status: { textAlign: "center", color: "#64748b", marginTop: "3rem" },
  error: { textAlign: "center", color: "#dc2626" },
  emptyBox: { textAlign: "center", marginTop: "4rem" },
  emptyText: { color: "#64748b", fontSize: "1.1rem", marginBottom: "1rem" },
  browseBtn: {
    padding: "0.65rem 1.5rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
  list: { display: "flex", flexDirection: "column", gap: "1rem" },
  row: {
    display: "flex",
    gap: "1.25rem",
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
    overflow: "hidden",
    alignItems: "center",
  },
  thumbnail: {
    width: "140px",
    minWidth: "140px",
    height: "90px",
    backgroundColor: "#1e293b",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },
  playIcon: { fontSize: "1.75rem", color: "#ffffff50" },
  info: { flex: 1, padding: "1rem 0" },
  title: {
    margin: "0 0 0.35rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#0f172a",
    cursor: "pointer",
  },
  description: { margin: "0 0 0.5rem", fontSize: "0.85rem", color: "#64748b" },
  meta: { display: "flex", gap: "1.25rem" },
  duration: { fontSize: "0.8rem", color: "#94a3b8" },
  addedAt: { fontSize: "0.8rem", color: "#94a3b8" },
  actions: {
    display: "flex",
    flexDirection: "column",
    gap: "0.5rem",
    padding: "1rem",
  },
  watchBtn: {
    padding: "0.45rem 1rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.875rem",
  },
  removeBtn: {
    padding: "0.45rem 1rem",
    backgroundColor: "transparent",
    color: "#ef4444",
    border: "1px solid #fca5a5",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.875rem",
  },
};