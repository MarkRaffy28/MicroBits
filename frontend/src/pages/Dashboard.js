import React from "react";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <div style={{ maxWidth: "600px", margin: "auto", padding: "2rem" }}>
      <h2>Welcome, {user?.username}!</h2>
      <p>
        <strong>Role:</strong> {user?.role}
      </p>

      <button onClick={handleLogout} style={{ marginTop: "1rem" }}>
        Logout
      </button>

      {user?.role === "admin" && (
        <div style={{ marginTop: "2rem" }}>
          <button onClick={() => navigate("/admin")}>Go to Admin Panel</button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
