import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <nav style={styles.nav}>
      <Link to="/library" style={styles.brand}>
        🎓 LMS
      </Link>

      <div style={styles.links}>
        <Link to="/library" style={styles.link}>Browse</Link>
        <Link to="/watchlist" style={styles.link}>Watchlist</Link>
        {user?.role === "admin" && (
          <Link to="/admin" style={styles.link}>Admin</Link>
        )}
        <span style={styles.email}>{user?.email}</span>
        <button onClick={handleLogout} style={styles.logoutBtn}>
          Logout
        </button>
      </div>
    </nav>
  );
}

const styles: Record<string, React.CSSProperties> = {
  nav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 2rem",
    height: "64px",
    backgroundColor: "#ffffff",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
    color: "#0f172a",
    position: "sticky",
    top: 0,
    zIndex: 100,
    borderBottom: "1px solid #f1f5f9",
  },
  brand: {
    color: "#2563eb",
    textDecoration: "none",
    fontSize: "1.35rem",
    fontWeight: 800,
    letterSpacing: "-0.5px",
    display: "flex",
    alignItems: "center",
    gap: "0.5rem",
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "1.75rem",
  },
  link: {
    color: "#475569",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: 600,
    transition: "color 0.2s ease",
  },
  email: {
    color: "#94a3b8",
    fontSize: "0.85rem",
    fontWeight: 500,
    marginLeft: "0.5rem",
    paddingLeft: "1.5rem",
    borderLeft: "1px solid #e2e8f0",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #e2e8f0",
    color: "#64748b",
    padding: "0.4rem 1rem",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "0.85rem",
    fontWeight: 600,
    transition: "all 0.2s ease",
    marginLeft: "0.5rem",
  },
};