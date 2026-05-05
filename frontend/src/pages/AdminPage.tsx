import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import {
  getDashboard,
  listAdminUsers,
  listAdminVideos,
  adminCreateVideo,
  adminPatchVideo,
  adminDeleteVideo,
  adminGetUploadUrl,
  uploadFileToS3,
  DashboardStats,
  AdminUserRow,
  AdminVideoRow,
} from "../api/admin";
import { formatDuration } from "../api/videos";

export default function AdminPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [videos, setVideos] = useState<AdminVideoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"videos" | "users">("videos");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tagsRaw, setTagsRaw] = useState("");

  const [uploadingId, setUploadingId] = useState<string | null>(null);

  async function refresh() {
    setError("");
    try {
      const [d, u, v] = await Promise.all([getDashboard(), listAdminUsers(), listAdminVideos()]);
      setStats(d);
      setUsers(u);
      setVideos(v);
    } catch {
      setError("Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const tags = tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
    try {
      await adminCreateVideo({ title, description, tags });
      setTitle("");
      setDescription("");
      setTagsRaw("");
      await refresh();
    } catch (err: any) {
      alert(err.response?.data?.error || "Create failed");
    }
  }

  async function togglePublish(v: AdminVideoRow) {
    try {
      await adminPatchVideo(v.id, { is_published: !v.is_published });
      await refresh();
    } catch {
      alert("Update failed");
    }
  }

  async function extractDuration(file: File): Promise<number> {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(video.src);
        resolve(Math.round(video.duration || 0));
      };
      video.onerror = () => resolve(0);
      video.src = URL.createObjectURL(file);
    });
  }

  async function handleDelete(v: AdminVideoRow) {
    if (!window.confirm(`Delete "${v.title}"?`)) return;
    try {
      await adminDeleteVideo(v.id);
      await refresh();
    } catch {
      alert("Delete failed");
    }
  }

  async function handleUpload(v: AdminVideoRow, file: File | null) {
    if (!file) return;
    const contentType = file.type || "video/mp4";
    setUploadingId(v.id);
    try {
      // Get exact video duration from file metadata before upload
      const durationSeconds = await extractDuration(file);
      
      const { upload_url } = await adminGetUploadUrl(v.id, contentType);
      await uploadFileToS3(upload_url, file, contentType);
      
      // Update duration on the backend once uploaded successfully
      if (durationSeconds > 0) {
        await adminPatchVideo(v.id, { duration_seconds: durationSeconds });
      }
      
      await refresh();
      alert("Upload complete. Publish the video when ready.");
    } catch (e: any) {
      alert(e.message || "Upload failed (check Content-Type matches video service).");
    } finally {
      setUploadingId(null);
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
        <Navbar />
        <p style={{ padding: "2rem" }}>Loading admin…</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f8fafc" }}>
      <Navbar />
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "2rem" }}>
        <h1 style={{ marginTop: 0 }}>Admin</h1>
        {error && <p style={{ color: "#dc2626" }}>{error}</p>}

        {stats && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
            <Stat label="Users" value={stats.users} />
            <Stat label="Videos (total)" value={stats.videos_total} />
            <Stat label="Published" value={stats.videos_published} />
            <Stat label="Drafts" value={stats.videos_draft} />
          </div>
        )}

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <TabButton active={tab === "videos"} onClick={() => setTab("videos")}>Videos</TabButton>
          <TabButton active={tab === "users"} onClick={() => setTab("users")}>Users</TabButton>
          <button type="button" onClick={refresh} style={secondaryBtn}>Refresh</button>
        </div>

        {tab === "videos" && (
          <>
            <form onSubmit={handleCreate} style={{ ...card, marginBottom: 24 }}>
              <h3 style={{ marginTop: 0 }}>New video (draft)</h3>
              <input
                placeholder="Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={input}
              />
              <textarea
                placeholder="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                style={{ ...input, resize: "vertical" }}
              />
              <input
                placeholder="Tags (comma-separated)"
                value={tagsRaw}
                onChange={(e) => setTagsRaw(e.target.value)}
                style={input}
              />
              <button type="submit" style={primaryBtn}>Create</button>
            </form>

            <div style={card}>
              <h3 style={{ marginTop: 0 }}>All videos</h3>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                    <th style={th}>Title</th>
                    <th style={th}>Status</th>
                    <th style={th}>Duration</th>
                    <th style={th}>File</th>
                    <th style={th}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {videos.map((v) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                      <td style={td}>{v.title}</td>
                      <td style={td}>{v.is_published ? "Published" : "Draft"}</td>
                      <td style={td}>{formatDuration(v.duration_seconds)}</td>
                      <td style={td}>{v.has_video_file ? "Yes" : "No"}</td>
                      <td style={td}>
                        <button type="button" onClick={() => togglePublish(v)} style={smallBtn}>
                          {v.is_published ? "Unpublish" : "Publish"}
                        </button>
                        <label style={{ marginLeft: 8, fontSize: 12, cursor: "pointer" }}>
                          <input
                            type="file"
                            accept="video/*"
                            style={{ display: "none" }}
                            disabled={uploadingId === v.id}
                            onChange={(e) => handleUpload(v, e.target.files?.[0] || null)}
                          />
                          {uploadingId === v.id ? "Uploading…" : "Upload"}
                        </label>
                        <button type="button" onClick={() => handleDelete(v)} style={{ ...smallBtn, marginLeft: 8, color: "#dc2626", borderColor: "#fecaca" }}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === "users" && (
          <div style={card}>
            <h3 style={{ marginTop: 0 }}>Users</h3>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", borderBottom: "1px solid #e2e8f0" }}>
                  <th style={th}>Email</th>
                  <th style={th}>Role</th>
                  <th style={th}>Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                    <td style={td}>{u.email}</td>
                    <td style={td}>{u.role}</td>
                    <td style={td}>{new Date(u.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ background: "#fff", borderRadius: 12, padding: 24, boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", border: "1px solid #f1f5f9" }}>
      <div style={{ fontSize: 13, color: "#64748b", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", marginTop: "0.5rem" }}>{value}</div>
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "10px 18px",
        borderRadius: 8,
        border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
        background: active ? "#0f172a" : "#fff",
        color: active ? "#fff" : "#475569",
        cursor: "pointer",
        fontWeight: 600,
        transition: "all 0.2s",
      }}
    >
      {children}
    </button>
  );
}

const card: React.CSSProperties = {
  background: "#fff",
  borderRadius: 12,
  padding: "2rem",
  boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)",
  border: "1px solid #f1f5f9",
  display: "flex",
  flexDirection: "column",
  gap: 16,
};

const input: React.CSSProperties = {
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  padding: "10px 14px",
  fontSize: 14,
  outline: "none",
};

const primaryBtn: React.CSSProperties = {
  alignSelf: "flex-start",
  padding: "10px 20px",
  background: "#0f172a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  marginTop: "0.5rem",
};

const secondaryBtn: React.CSSProperties = {
  marginLeft: "auto",
  padding: "8px 16px",
  background: "#fff",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  cursor: "pointer",
  fontWeight: 600,
  color: "#0f172a",
};

const smallBtn: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 12,
  fontWeight: 600,
  borderRadius: 6,
  border: "1px solid #cbd5e1",
  background: "#fff",
  cursor: "pointer",
};

const th: React.CSSProperties = {
  padding: "16px 12px",
  fontWeight: 600,
  color: "#475569",
  fontSize: 13,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
};

const td: React.CSSProperties = {
  padding: "16px 12px",
  color: "#0f172a",
  fontWeight: 500,
};