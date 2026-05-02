import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import LibraryPage from "./pages/LibraryPage";
import PlayerPage from "./pages/PlayerPage";
import PrivateRoute from "./components/PrivateRoute";
import WatchlistPage from "./pages/WatchlistPage";
import AdminPage from "./pages/AdminPage";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Protected routes */}
          <Route
            path="/library"
            element={
              <PrivateRoute>
                <LibraryPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/player/:id"
            element={
              <PrivateRoute>
                <PlayerPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/watchlist"
            element={
              <PrivateRoute>
                <WatchlistPage />
              </PrivateRoute>
            }
          />
          <Route
  path="/admin"
  element={
    <AdminRoute>
      <AdminPage />
    </AdminRoute>
  }
/>

          {/* Redirect root → library if logged in, else login handles it */}
          <Route path="/" element={<Navigate to="/library" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}