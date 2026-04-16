import React from "react";
import { useNavigate } from "react-router-dom";
import { Video, formatDuration } from "../api/videos";

interface Props {
  video: Video;
}

export default function VideoCard({ video }: Props) {
  const navigate = useNavigate();

  return (
    <div
      style={styles.card}
      onClick={() => navigate(`/player/${video.id}`)}
    >
      {/* Thumbnail placeholder — swap with <img> when thumbnails are ready */}
      <div style={styles.thumbnail}>
        <span style={styles.playIcon}>▶</span>
      </div>

      <div style={styles.info}>
        <h3 style={styles.title}>{video.title}</h3>
        <p style={styles.description}>
          {video.description.length > 80
            ? video.description.slice(0, 80) + "..."
            : video.description}
        </p>
        <div style={styles.meta}>
          <span style={styles.duration}>{formatDuration(video.duration_seconds)}</span>
          <div style={styles.tags}>
            {video.tags.slice(0, 3).map((tag) => (
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
    backgroundColor: "#fff",
    borderRadius: "10px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
    overflow: "hidden",
    cursor: "pointer",
    transition: "transform 0.15s, box-shadow 0.15s",
  },
  thumbnail: {
    backgroundColor: "#1e293b",
    height: "160px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  playIcon: {
    fontSize: "2.5rem",
    color: "#ffffff60",
  },
  info: {
    padding: "1rem",
  },
  title: {
    margin: "0 0 0.4rem",
    fontSize: "1rem",
    fontWeight: 600,
    color: "#111",
  },
  description: {
    margin: "0 0 0.75rem",
    fontSize: "0.85rem",
    color: "#64748b",
    lineHeight: 1.4,
  },
  meta: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  duration: {
    fontSize: "0.8rem",
    color: "#94a3b8",
    fontWeight: 500,
  },
  tags: {
    display: "flex",
    gap: "0.35rem",
  },
  tag: {
    backgroundColor: "#f1f5f9",
    color: "#475569",
    padding: "0.2rem 0.5rem",
    borderRadius: "999px",
    fontSize: "0.7rem",
    fontWeight: 500,
  },
};