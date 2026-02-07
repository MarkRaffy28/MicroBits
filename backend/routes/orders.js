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
 * CREATE ORDER
 */
router.post("/", (req, res) => {
  const db = readDB();
  const { userId, items, paymentMethod } = req.body;

  if (!items || items.length === 0) {
    return res.status(400).json({ message: "Cart is empty" });
  }

  let totalAmount = 0;

  // Validate stock & compute total
  for (const item of items) {
    const product = db.products.find(
      (p) => String(p.id) === String(item.productId)
    );

    if (!product) {
      return res.status(404).json({
        message: `Product ${item.productId} not found`,
      });
    }

    const stock = Number(product.stock);
    const qty = Number(item.quantity);
    const price = Number(product.price);

    if (stock < qty) {
      return res.status(400).json({
        message: `Insufficient stock for ${product.name}`,
      });
    }

    totalAmount += price * qty;
  }

  // Deduct stock
  items.forEach((item) => {
    const product = db.products.find(
      (p) => String(p.id) === String(item.productId)
    );
    product.stock = Number(product.stock) - Number(item.quantity);
  });

  const newOrder = {
    id: String(db.orders.length + 1),
    userId: String(userId),
    items,
    totalAmount,
    status: "pending",
    paymentMethod,
    createdAt: new Date().toISOString(),
  };

  db.orders.push(newOrder);
  writeDB(db);

  res.status(201).json(newOrder);
});

/**
 * GET ALL ORDERS (ADMIN)
 */
router.get("/", (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

/**
 * GET ORDERS BY USER
 */
router.get("/user/:userId", (req, res) => {
  const db = readDB();
  const orders = db.orders.filter(
    (o) => String(o.userId) === String(req.params.userId)
  );

  res.json(orders);
});

/**
 * UPDATE ORDER STATUS (ADMIN)
 */
router.put("/:id/status", (req, res) => {
  const db = readDB();
  const order = db.orders.find(
    (o) => String(o.id) === String(req.params.id)
  );

  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }

  order.status = req.body.status;
  writeDB(db);

  res.json(order);
});

module.exports = router;
