const express = require("express");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const path = require("path");
const router = express.Router();

const SECRET_KEY = "mySecretKey";
const dbPath = path.join(__dirname, "../data/db.json");

// Read users from db.json
const getUsers = () => {
  const db = JSON.parse(fs.readFileSync(dbPath));
  return db.users || [];
};

// LOGIN ROUTE
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  const users = getUsers();
  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    SECRET_KEY,
    { expiresIn: "1h" }
  );

  res.json({ token });
});

module.exports = router;
