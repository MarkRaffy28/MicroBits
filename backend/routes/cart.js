const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dbPath = path.join(__dirname, "../data/db.json");

const readDB = () =>
  JSON.parse(fs.readFileSync(dbPath, "utf-8"));

const writeDB = (data) =>
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

/**
 * GET CART BY USER
 */
router.get("/:userId", (req, res) => {
  const db = readDB();
  const user = db.users.find(
    (u) => String(u.id) === String(req.params.userId)
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user.cart || []);
});

/**
 * ADD ITEM TO CART
 */
router.post("/:userId", (req, res) => {
  const db = readDB();
  const { productId, quantity } = req.body;

  const user = db.users.find(
    (u) => String(u.id) === String(req.params.userId)
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.cart = user.cart || [];

  const existingItem = user.cart.find(
    (item) => String(item.productId) === String(productId)
  );

  if (existingItem) {
    existingItem.quantity += Number(quantity);
  } else {
    user.cart.push({
      productId: String(productId),
      quantity: Number(quantity),
    });
  }

  writeDB(db);
  res.json(user.cart);
});

/**
 * UPDATE CART ITEM QUANTITY
 */
router.put("/:userId", (req, res) => {
  const db = readDB();
  const { productId, quantity } = req.body;

  const user = db.users.find(
    (u) => String(u.id) === String(req.params.userId)
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const item = user.cart.find(
    (i) => String(i.productId) === String(productId)
  );

  if (!item) {
    return res.status(404).json({ message: "Item not in cart" });
  }

  item.quantity = Number(quantity);
  writeDB(db);

  res.json(user.cart);
});

/**
 * REMOVE ITEM FROM CART
 */
router.delete("/:userId/:productId", (req, res) => {
  const db = readDB();
  const user = db.users.find(
    (u) => String(u.id) === String(req.params.userId)
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.cart = user.cart.filter(
    (i) => String(i.productId) !== String(req.params.productId)
  );

  writeDB(db);
  res.json(user.cart);
});

/**
 * CLEAR CART
 */
router.delete("/:userId", (req, res) => {
  const db = readDB();
  const user = db.users.find(
    (u) => String(u.id) === String(req.params.userId)
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  user.cart = [];
  writeDB(db);

  res.json({ message: "Cart cleared" });
});

module.exports = router;
