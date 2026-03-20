import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AdminRoute = ({ children }) => {
  const { isAdmin, loading } = useAuth();

  if (loading) return null;

  return isAdmin ? children : <Navigate to="/home" />;
};

export default AdminRoute;