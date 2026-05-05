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
                  <img src={`https://picsum.photos/seed/${video.id}/320/180`} alt={video.title} style={styles.thumbnailImg} loading="lazy" />
                  <div style={styles.playOverlay}>
                    <span style={styles.playIcon}>▶</span>
                  </div>
                  <span style={styles.durationBadge}>{formatDuration(video.duration_seconds)}</span>
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
  content: { maxWidth: "1000px", margin: "0 auto", padding: "2.5rem 1.5rem" },
  heading: { fontSize: "2rem", color: "#0f172a", marginBottom: "2.5rem", fontWeight: 800, letterSpacing: "-0.5px" },
  status: { textAlign: "center", color: "#64748b", marginTop: "3rem", fontSize: "1.1rem" },
  error: { textAlign: "center", color: "#dc2626", backgroundColor: "#fef2f2", padding: "1rem", borderRadius: "8px" },
  emptyBox: { textAlign: "center", marginTop: "5rem", padding: "3rem", backgroundColor: "#f1f5f9", borderRadius: "16px" },
  emptyText: { color: "#475569", fontSize: "1.15rem", marginBottom: "1.5rem", fontWeight: 500 },
  browseBtn: {
    padding: "0.8rem 1.75rem",
    backgroundColor: "#0f172a",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.95rem",
  },
  list: { display: "flex", flexDirection: "column", gap: "1.25rem" },
  row: {
    display: "flex",
    gap: "1.5rem",
    backgroundColor: "#fff",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
    overflow: "hidden",
    alignItems: "stretch",
    border: "1px solid #f1f5f9",
    transition: "transform 0.2s",
  },
  thumbnail: {
    width: "220px",
    minWidth: "220px",
    position: "relative",
    backgroundColor: "#e2e8f0",
    cursor: "pointer",
    display: "flex",
    overflow: "hidden",
  },
  thumbnailImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  playOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.2)",
    opacity: 0,
    transition: "opacity 0.2s",
  },
  durationBadge: {
    position: "absolute",
    bottom: "8px",
    right: "8px",
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    color: "#fff",
    padding: "2px 6px",
    borderRadius: "4px",
    fontSize: "0.75rem",
    fontWeight: 600,
  },
  playIcon: { fontSize: "2.5rem", color: "#ffffff" },
  info: { flex: 1, padding: "1.5rem 0", display: "flex", flexDirection: "column", justifyContent: "center" },
  title: {
    margin: "0 0 0.5rem",
    fontSize: "1.2rem",
    fontWeight: 700,
    color: "#0f172a",
    cursor: "pointer",
    letterSpacing: "-0.2px",
  },
  description: { margin: "0 0 0.75rem", fontSize: "0.9rem", color: "#64748b", lineHeight: 1.5 },
  meta: { display: "flex", gap: "1.5rem", marginTop: "auto" },
  duration: { fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 },
  addedAt: { fontSize: "0.85rem", color: "#94a3b8", fontWeight: 500 },
  actions: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "1.5rem",
    borderLeft: "1px solid #f1f5f9",
    background: "#fafafa",
  },
  watchBtn: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "0.9rem",
    width: "100%",
  },
  removeBtn: {
    padding: "0.6rem 1.2rem",
    backgroundColor: "#fff",
    color: "#ef4444",
    border: "1px solid #fca5a5",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.9rem",
    fontWeight: 600,
    width: "100%",
    transition: "background 0.2s",
  },
};