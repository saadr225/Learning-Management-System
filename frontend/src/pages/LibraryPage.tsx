import React, { useEffect, useState, useCallback } from "react";
import Navbar from "../components/Navbar";
import VideoCard from "../components/VideoCard";
import { listVideos, Video } from "../api/videos";

export default function LibraryPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const LIMIT = 12;

  const fetchVideos = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await listVideos({ search: search || undefined, page, limit: LIMIT });
      setVideos(data.videos);
      setTotal(data.total);
    } catch {
      setError("Failed to load videos. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div style={styles.page}>
      <Navbar />

      <div style={styles.content}>
        <div style={styles.header}>
          <h1 style={styles.heading}>Video Library</h1>
          <form onSubmit={handleSearch} style={styles.searchForm}>
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search videos..."
              style={styles.searchInput}
            />
            <button type="submit" style={styles.searchBtn}>Search</button>
            {search && (
              <button
                type="button"
                style={styles.clearBtn}
                onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }}
              >
                Clear
              </button>
            )}
          </form>
        </div>

        {loading && <p style={styles.status}>Loading videos...</p>}
        {error && <p style={styles.error}>{error}</p>}

        {!loading && !error && videos.length === 0 && (
          <p style={styles.status}>
            {search ? `No videos found for "${search}"` : "No videos published yet."}
          </p>
        )}

        <div style={styles.grid}>
          {videos.map((video) => (
            <VideoCard key={video.id} video={video} />
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={styles.pagination}>
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              style={styles.pageBtn}
            >
              ← Prev
            </button>
            <span style={styles.pageInfo}>Page {page} of {totalPages}</span>
            <button
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              style={styles.pageBtn}
            >
              Next →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", backgroundColor: "#f8fafc" },
  content: { maxWidth: "1200px", margin: "0 auto", padding: "2rem" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "2rem",
    flexWrap: "wrap",
    gap: "1rem",
  },
  heading: { margin: 0, fontSize: "1.75rem", color: "#0f172a" },
  searchForm: { display: "flex", gap: "0.5rem" },
  searchInput: {
    padding: "0.55rem 1rem",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    fontSize: "0.9rem",
    width: "240px",
    outline: "none",
  },
  searchBtn: {
    padding: "0.55rem 1.1rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: 600,
  },
  clearBtn: {
    padding: "0.55rem 1rem",
    backgroundColor: "transparent",
    color: "#64748b",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
    gap: "1.5rem",
  },
  status: { textAlign: "center", color: "#64748b", marginTop: "4rem" },
  error: { textAlign: "center", color: "#dc2626", marginTop: "2rem" },
  pagination: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "1rem",
    marginTop: "3rem",
  },
  pageBtn: {
    padding: "0.5rem 1.25rem",
    border: "1px solid #e2e8f0",
    borderRadius: "6px",
    cursor: "pointer",
    backgroundColor: "#fff",
    color: "#374151",
  },
  pageInfo: { color: "#64748b", fontSize: "0.9rem" },
};