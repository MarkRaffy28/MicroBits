import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";

import Home from "./pages/user/Home";

import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";

import UserRoute from "./components/UserRoute";
import AdminRoute from "./components/AdminRoute";
import AdminLayout from "./pages/admin/AdminLayout";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/home"
          element={
            <UserRoute>
              <Home />
            </UserRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="products" element={<Products />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;