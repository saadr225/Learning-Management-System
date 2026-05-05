import React from "react";
import { useNavigate } from "react-router-dom";
import { Video, formatDuration } from "../api/videos";

interface Props {
  video: Video;
}

export default function VideoCard({ video }: Props) {
  const navigate = useNavigate();
  // Generate a predictable, modern placeholder thumbnail based on the video ID if no real thumbnail is provided yet
  const thumbnailUrl = `https://picsum.photos/seed/${video.id}/640/360`;

  return (
    <div
      style={styles.card}
      onClick={() => navigate(`/player/${video.id}`)}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}
    >
      <div style={styles.thumbnailWrapper}>
        <img src={thumbnailUrl} alt={video.title} style={styles.thumbnailImg} loading="lazy" />
        <div style={styles.playOverlay}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
        {video.duration_seconds > 0 ? (
          <span style={styles.durationBadge}>{formatDuration(video.duration_seconds)}</span>
        ) : (
          <span style={styles.durationBadge}>12:34</span> // Fallback placeholder if duration isn't set yet
        )}
      </div>

      <div style={styles.info}>
        <h3 style={styles.title} title={video.title}>{video.title}</h3>
        <p style={styles.description}>
          {video.description.length > 70
            ? video.description.slice(0, 70) + "..."
            : video.description || "No description provided."}
        </p>
        <div style={styles.meta}>
          <span style={styles.date}>
            {new Date(video.created_at).toLocaleDateString(undefined, { 
              month: 'short', day: 'numeric', year: 'numeric' 
            })}
          </span>
          <div style={styles.tags}>
            {video.tags.slice(0, 2).map((tag) => (
              <span key={tag} style={styles.tag}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
    overflow: "hidden",
    cursor: "pointer",
    transition: "transform 0.2s ease, box-shadow 0.2s ease",
    display: "flex",
    flexDirection: "column",
    height: "100%",
    border: "1px solid #f1f5f9",
  },
  thumbnailWrapper: {
    position: "relative",
    width: "100%",
    paddingTop: "56.25%", // 16:9 Aspect Ratio
    backgroundColor: "#e2e8f0",
    overflow: "hidden",
  },
  thumbnailImg: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    transition: "transform 0.3s ease",
  },
  playOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    borderRadius: "50%",
    width: "60px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0,
    transition: "opacity 0.2s ease",
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
    letterSpacing: "0.5px",
  },
  info: {
    padding: "1.25rem",
    display: "flex",
    flexDirection: "column",
    flexGrow: 1,
  },
  title: {
    margin: "0 0 0.5rem",
    fontSize: "1.1rem",
    fontWeight: 700,
    color: "#0f172a",
    lineHeight: "1.3",
    display: "-webkit-box",
    WebkitLineClamp: 2,
    WebkitBoxOrient: "vertical",
    overflow: "hidden",
  },
  description: {
    margin: "0 0 1rem",
    fontSize: "0.875rem",
    color: "#64748b",
    lineHeight: 1.5,
    flexGrow: 1,
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "auto",
    paddingTop: "0.75rem",
    borderTop: "1px solid #f1f5f9",
  },
  date: {
    fontSize: "0.75rem",
    color: "#94a3b8",
    fontWeight: 500,
  },
  tags: {
    display: "flex",
    gap: "0.5rem",
  },
  tag: {
    backgroundColor: "#eff6ff",
    color: "#3b82f6",
    padding: "0.25rem 0.6rem",
    borderRadius: "6px",
    fontSize: "0.7rem",
    fontWeight: 600,
    textTransform: "capitalize",
  },
};