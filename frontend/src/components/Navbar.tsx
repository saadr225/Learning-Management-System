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
    height: "60px",
    backgroundColor: "#1e293b",
    color: "#fff",
    position: "sticky",
    top: 0,
    zIndex: 100,
  },
  brand: {
    color: "#fff",
    textDecoration: "none",
    fontSize: "1.25rem",
    fontWeight: 700,
  },
  links: {
    display: "flex",
    alignItems: "center",
    gap: "1.5rem",
  },
  link: {
    color: "#94a3b8",
    textDecoration: "none",
    fontSize: "0.9rem",
    fontWeight: 500,
  },
  email: {
    color: "#64748b",
    fontSize: "0.85rem",
  },
  logoutBtn: {
    background: "transparent",
    border: "1px solid #475569",
    color: "#94a3b8",
    padding: "0.35rem 0.85rem",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
};