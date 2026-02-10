import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";

import Home from "./pages/user/Home";
import ProductDetail from "./pages/user/ProductDetail";
import Shop from "./pages/user/Shop";

import Dashboard from "./pages/admin/Dashboard";
import Products from "./pages/admin/Products";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import UserLayout from "./pages/user/UserLayout";
import UserRoute from "./components/UserRoute";
import Cart from "./pages/user/Cart";
import { CartProvider } from "./context/CartContext";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/user"
          element={
            <CartProvider>
              <UserRoute>
                <UserLayout />
              </UserRoute>
            </CartProvider>
          }
          >
          <Route index element={<Home />} />
          <Route path="shop" element={<Shop />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="cart" element={<Cart />} />
        </Route>

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