const express = require("express");
const jwt = require("jsonwebtoken");
const router = express.Router();

const users = [
  { id: 1, username: "admin", password: "admin123", role: "admin" },
  { id: 2, username: "user", password: "user123", role: "user" },
];

const SECRET_KEY = "mySecretKey";

// LOGIN ROUTE
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(
    (u) => u.username === username && u.password === password,
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: "1h" },
  );

  res.json({ token });
});

const { verifyToken, isAdmin } = require("../middleware/authMiddleware");

// USER DASHBOARD ROUTE
router.get("/dashboard", verifyToken, (req, res) => {
  res.json({ message: `Welcome, ${req.user.username}!` });
});

// ADMIN PANEL ROUTE
router.get("/admin", verifyToken, isAdmin, (req, res) => {
  res.json({ message: `Hello Admin ${req.user.username}` });
});
module.exports = router;
