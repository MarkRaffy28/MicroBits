import React from "react";
import { useNavigate } from "react-router-dom";

const AdminPanel = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "2rem" }}>
      <h2>Admin Panel</h2>
      <p>Welcome, {user?.username}. You have admin access.</p>

      <button
        onClick={() => navigate("/dashboard")}
        style={{ marginTop: "1rem" }}
      >
        Back to Dashboard
      </button>
    </div>
  );
};

export default AdminPanel;
