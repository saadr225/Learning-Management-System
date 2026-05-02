import { Navigate } from "react-router-dom";
import React from "react";
import PrivateRoute from "./PrivateRoute";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({ children }: { children: React.ReactElement }) {
  return (
    <PrivateRoute>
      <AdminGate>{children}</AdminGate>
    </PrivateRoute>
  );
}

function AdminGate({ children }: { children: React.ReactElement }) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <p style={{ padding: "2rem" }}>Loading...</p>;
  if (user?.role !== "admin") {
    return <Navigate to="/library" replace />;
  }
  return children;
}