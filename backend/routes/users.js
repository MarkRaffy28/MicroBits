const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const router = express.Router();
const dbPath = path.join(__dirname, "../data/db.json");
const imagesPath = path.join(__dirname, "../data/images/users");

// Ensure images folder exists
if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });

// =========================
// Helper Functions
// =========================
const readDB = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

const deleteOldImages = (userId) => {
  const files = fs.readdirSync(imagesPath);
  files.forEach((file) => {
    if (file.startsWith(userId + ".")) {
      fs.unlinkSync(path.join(imagesPath, file));
    }
  });
};

const getProfileImage = (userId) => {
  const file = path.join(imagesPath, `${userId}.webp`);
  return fs.existsSync(file) ? `/data/images/users/${userId}.webp` : null;
};

const saveImageWebp = async (buffer, userId) => {
  const filepath = path.join(imagesPath, `${userId}.webp`);
  await sharp(buffer)
    .webp({ quality: 80 })
    .toFile(filepath);
};

// Multer setup
const uploadMemory = multer({ storage: multer.memoryStorage() });

// =========================
// ROUTES
// =========================

// GET all users
router.get("/", (req, res) => {
  const db = readDB();
  const users = (db.users || []).map((u) => ({
    ...u,
    profilePicture: getProfileImage(u.id),
  }));
  res.json(users);
});

// GET user by ID
router.get("/:id", (req, res) => {
  const db = readDB();
  const user = db.users.find((u) => u.id === Number(req.params.id));
  if (!user) return res.status(404).json({ message: "User not found" });

  res.json({ ...user, profilePicture: getProfileImage(user.id) });
});

// CHECK if username exists
router.get("/check/username/:username", (req, res) => {
  const db = readDB();
  const exists = db.users.some(
    (u) => u.username.toLowerCase() === req.params.username.toLowerCase()
  );
  res.json({ exists });
});

// CREATE user
router.post("/", uploadMemory.single("profilePicture"), async (req, res) => {
  const db = readDB();
  const { username, email, password, firstName, middleName, lastName, phoneNumber, address, role } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required" });
  }

  const newUser = {
    id: db.users.length ? db.users[db.users.length - 1].id + 1 : 1,
    username,
    email: email || "",
    password,
    firstName: firstName || "",
    middleName: middleName || "",
    lastName: lastName || "",
    phoneNumber: phoneNumber || "",
    address: address || "",
    role: role || "user",
    createdAt: new Date().toISOString(),
  };

  db.users.push(newUser);
  writeDB(db);

  // Save profile picture
  if (req.file) {
    deleteOldImages(newUser.id);
    await saveImageWebp(req.file.buffer, newUser.id);
  }

  res.status(201).json({ ...newUser, profilePicture: getProfileImage(newUser.id) });
});

// UPDATE user
router.put("/:id", uploadMemory.single("profilePicture"), async (req, res) => {
  const db = readDB();
  const index = db.users.findIndex((u) => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "User not found" });

  db.users[index] = { ...db.users[index], ...req.body };

  // Save profile picture if provided
  if (req.file) {
    deleteOldImages(db.users[index].id);
    await saveImageWebp(req.file.buffer, db.users[index].id);
  }

  writeDB(db);

  res.json({ ...db.users[index], profilePicture: getProfileImage(db.users[index].id) });
});

// DELETE user
router.delete("/:id", (req, res) => {
  const db = readDB();
  const index = db.users.findIndex((u) => u.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "User not found" });

  deleteOldImages(db.users[index].id);

  const deletedUser = db.users.splice(index, 1);
  writeDB(db);

  res.json({ message: "User deleted", user: deletedUser[0] });
});

module.exports = router;
