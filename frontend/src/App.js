import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { CartProvider } from "./context/CartContext";

import Login from "./pages/Login";
import Register from "./pages/Register";

import Home from "./pages/user/Home";
import Cart from "./pages/user/Cart";
import ProductDetail from "./pages/user/ProductDetail";
import Profile from "./pages/user/Profile";
import Shop from "./pages/user/Shop";

import Dashboard from "./pages/admin/Dashboard";
import OrderDetail from "./pages/user/OrderDetail";
import Orders from "./pages/admin/Orders";
import Products from "./pages/admin/Products";
import UserOrders from "./pages/user/UserOrders";
import Users from "./pages/admin/Users";

import AdminLayout from "./pages/admin/AdminLayout";
import AdminRoute from "./components/AdminRoute";
import UserLayout from "./pages/user/UserLayout";
import UserRoute from "./components/UserRoute";

import NotFound from "./pages/NotFound";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
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
          <Route path="home" element={<Home />} />
          <Route path="order/:id" element={<OrderDetail />} />
          <Route path="orders/:status" element={<UserOrders />} />
          <Route path="product/:id" element={<ProductDetail />} />
          <Route path="profile" element={<Profile />} />
          <Route path="shop" element={<Shop />} />
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
          <Route path="orders/:status" element={<Orders />} />
          <Route path="users/:role" element={<Users />} />
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;