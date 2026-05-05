import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { registerUser } from "../api/auth";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(email, password, role);
      login(data.access_token, data.refresh_token!, data.user);
      navigate("/library");
    } catch (err: any) {
      const msg = err.response?.data?.error || "Registration failed. Try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h2 style={styles.title}>Create Account</h2>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <label style={styles.label}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            style={styles.input}
          />

          <label style={styles.label}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            required
            style={styles.input}
          />

          <label style={styles.label}>Confirm Password</label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat password"
            required
            style={styles.input}
          />

          <label style={styles.label}>Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            style={styles.input}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <button type="submit" disabled={loading} style={styles.button}>
            {loading ? "Creating account..." : "Register"}
          </button>
        </form>

        <p style={styles.footer}>
          Already have an account?{" "}
          <Link to="/login" style={styles.link}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// Reuse same styles object from LoginPage
const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f8fafc",
    padding: "1rem",
  },
  card: {
    backgroundColor: "#fff",
    padding: "2.5rem 2rem",
    borderRadius: "16px",
    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
    width: "100%",
    maxWidth: "420px",
    border: "1px solid #f1f5f9",
  },
  title: { textAlign: "center", marginBottom: "2rem", color: "#0f172a", fontSize: "1.75rem", fontWeight: 700, letterSpacing: "-0.5px" },
  error: {
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: "0.75rem 1rem",
    borderRadius: "8px",
    marginBottom: "1.5rem",
    fontSize: "0.875rem",
    fontWeight: 500,
    border: "1px solid #fecaca",
  },
  form: { display: "flex", flexDirection: "column", gap: "1rem" },
  label: { fontWeight: 600, fontSize: "0.875rem", color: "#475569", marginBottom: "-0.5rem" },
  input: {
    padding: "0.75rem 1rem",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    fontSize: "0.95rem",
    outline: "none",
    transition: "border-color 0.2s, box-shadow 0.2s",
    backgroundColor: "#f8fafc",
  },
  button: {
    marginTop: "0.75rem",
    padding: "0.85rem",
    backgroundColor: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    fontSize: "1rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "background-color 0.2s",
    boxShadow: "0 1px 2px rgba(37, 99, 235, 0.3)",
  },
  footer: { textAlign: "center", marginTop: "1.75rem", fontSize: "0.9rem", color: "#64748b" },
  link: { color: "#2563eb", textDecoration: "none", fontWeight: 600 },
};