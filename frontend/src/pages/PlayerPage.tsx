import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactPlayer from "react-player";
import Navbar from "../components/Navbar";
import { getVideo, getStreamUrl, formatDuration, Video } from "../api/videos";
import { checkInWatchlist, addToWatchlist, removeFromWatchlist } from "../api/watchlist";

export default function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [video, setVideo] = useState<Video | null>(null);
  const [streamUrl, setStreamUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [inWatchlist, setInWatchlist] = useState(false);
  const [watchlistLoading, setWatchlistLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    async function load() {
      try {
        const [videoData, url, watchlisted] = await Promise.all([
          getVideo(id!),
          getStreamUrl(id!),
          checkInWatchlist(id!),
        ]);
        setVideo(videoData);
        setStreamUrl(url);
        setInWatchlist(watchlisted);
      } catch (err: any) {
        const msg = err.response?.data?.error || "Failed to load video.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id]);

  async function handleWatchlistToggle() {
    if (!id) return;
    setWatchlistLoading(true);
    try {
      if (inWatchlist) {
        await removeFromWatchlist(id);
        setInWatchlist(false);
      } else {
        await addToWatchlist(id);
        setInWatchlist(true);
      }
    } catch {
      alert("Failed to update watchlist.");
    } finally {
      setWatchlistLoading(false);
    }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <Navbar />
        <p style={styles.status}>Loading video...</p>
      </div>
    );
  }

  if (error || !video) {
    return (
      <div style={styles.page}>
        <Navbar />
        <div style={styles.errorBox}>
          <p style={styles.errorText}>{error || "Video not found."}</p>
          <button onClick={() => navigate("/library")} style={styles.backBtn}>
            ← Back to Library
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.content}>
        {/* Video player */}
        <div style={styles.playerWrapper}>
          <ReactPlayer
            src={streamUrl}
            controls
            width="100%"
            height="100%"
            style={{ position: "absolute", top: 0, left: 0 }}
          />
        </div>

        {/* Video info */}
        <div style={styles.info}>
          <button onClick={() => navigate("/library")} style={styles.backLink}>
            ← Back to Library
          </button>

          <h1 style={styles.title}>{video.title}</h1>
          <button
            onClick={handleWatchlistToggle}
            disabled={watchlistLoading}
            style={{
              padding: "0.5rem 1.25rem",
              backgroundColor: inWatchlist ? "transparent" : "#2563eb",
              color: inWatchlist ? "#ef4444" : "#fff",
              border: inWatchlist ? "1px solid #ef4444" : "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: "0.875rem",
              marginBottom: "1rem",
            }}
          >
            {watchlistLoading ? "..." : inWatchlist ? "− Remove from Watchlist" : "+ Add to Watchlist"}
          </button>

          <div style={styles.meta}>
            <span style={styles.duration}>
              ⏱ {formatDuration(video.duration_seconds)}
            </span>
            <span style={styles.date}>
              {new Date(video.created_at).toLocaleDateString("en-US", {
                year: "numeric", month: "long", day: "numeric",
              })}
            </span>
          </div>

          <div style={styles.tags}>
            {video.tags.map((tag) => (
              <span key={tag} style={styles.tag}>{tag}</span>
            ))}
          </div>

          <p style={styles.description}>{video.description}</p>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#020617", color: "#fff" },
  content: { maxWidth: "1100px", margin: "0 auto", padding: "2rem 1.5rem" },
  playerWrapper: {
    position: "relative",
    paddingTop: "56.25%", // 16:9 aspect ratio
    backgroundColor: "#000",
    borderRadius: "12px",
    overflow: "hidden",
    boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
    border: "1px solid #1e293b",
  },
  info: {
    marginTop: "2rem",
    backgroundColor: "#0f172a",
    borderRadius: "12px",
    padding: "2rem",
    border: "1px solid #1e293b",
  },
  backLink: {
    background: "none",
    border: "none",
    color: "#94a3b8",
    cursor: "pointer",
    fontSize: "0.95rem",
    padding: 0,
    marginBottom: "1.5rem",
    display: "flex",
    alignItems: "center",
    fontWeight: 500,
    transition: "color 0.2s",
  },
  title: {
    margin: "0 0 1rem",
    fontSize: "2rem",
    fontWeight: 800,
    color: "#f8fafc",
    letterSpacing: "-0.5px",
  },
  meta: {
    display: "flex",
    gap: "1.5rem",
    marginBottom: "1.5rem",
    paddingBottom: "1.5rem",
    borderBottom: "1px solid #1e293b",
  },
  duration: { color: "#94a3b8", fontSize: "0.95rem", fontWeight: 500 },
  date: { color: "#94a3b8", fontSize: "0.95rem", fontWeight: 500 },
  tags: { display: "flex", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" },
  tag: {
    backgroundColor: "rgba(37, 99, 235, 0.15)",
    color: "#bfdbfe",
    padding: "0.35rem 0.85rem",
    borderRadius: "8px",
    fontSize: "0.8rem",
    fontWeight: 600,
    letterSpacing: "0.5px",
    textTransform: "uppercase",
  },
  description: {
    color: "#cbd5e1",
    fontSize: "1.05rem",
    lineHeight: 1.7,
    marginTop: "0.5rem",
  },
  status: { textAlign: "center", color: "#94a3b8", marginTop: "4rem", fontSize: "1.1rem" },
  errorBox: { textAlign: "center", marginTop: "4rem" },
  errorText: { color: "#ef4444", fontSize: "1.1rem", marginBottom: "1rem" },
  backBtn: {
    padding: "0.6rem 1.5rem",
    backgroundColor: "#1e293b",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: 600,
  },
};