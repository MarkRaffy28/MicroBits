const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dbPath = path.join(__dirname, "../data/db.json");

const readDB = () => JSON.parse(fs.readFileSync(dbPath, "utf-8"));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

/**
 * GET ALL ORDERS (ADMIN)
 */
router.get("/", (req, res) => {
  const db = readDB();
  res.json(db.orders);
});

/**
 * GET ORDERS BY USER — must be before /:id to avoid conflict
 */
router.get("/user/:userId", (req, res) => {
  const db = readDB();
  const orders = db.orders.filter((o) => o.userId === Number(req.params.userId));
  res.json(orders);
});

/**
 * GET ORDER BY ID
 */
router.get("/:id", (req, res) => {
  const db = readDB();
  const order = db.orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ message: "Order not found" });
  res.json(order);
});

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
    const product = db.products.find((p) => p.id === item.productId);
    if (!product) {
      return res.status(404).json({ message: `Product ${item.productId} not found` });
    }

    const stock = Number(product.stock);
    const qty   = Number(item.quantity);

    if (stock < qty) {
      return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
    }

    totalAmount += Number(product.price) * qty;
  }

  // Deduct stock
  items.forEach((item) => {
    const product = db.products.find((p) => p.id === item.productId);
    product.stock = Number(product.stock) - Number(item.quantity);
  });

  const newOrder = {
    id: db.orders.length ? db.orders[db.orders.length - 1].id + 1 : 1,
    userId,
    items: items.map((item) => ({
      productId: item.productId,
      quantity:  Number(item.quantity),
      price:     Number(db.products.find((p) => p.id === item.productId)?.price ?? 0),
    })),
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
 * FULL UPDATE ORDER (ADMIN)
 * Updates items, paymentMethod, status
 * Restores old stock then deducts new stock when items change
 */
router.put("/:id", (req, res) => {
  const db = readDB();
  const index = db.orders.findIndex((o) => o.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Order not found" });

  const oldOrder = db.orders[index];
  const { items, paymentMethod, status } = req.body;

  if (items && items.length > 0) {
    // Step 1: Restore stock from old items
    oldOrder.items.forEach((oldItem) => {
      const product = db.products.find((p) => p.id === oldItem.productId);
      if (product) product.stock = Number(product.stock) + Number(oldItem.quantity);
    });

    // Step 2: Validate & deduct new items
    let totalAmount = 0;
    for (const item of items) {
      const product = db.products.find((p) => p.id === item.productId);

      if (!product) {
        // Rollback restored stock
        oldOrder.items.forEach((oldItem) => {
          const p = db.products.find((p) => p.id === oldItem.productId);
          if (p) p.stock = Number(p.stock) - Number(oldItem.quantity);
        });
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      const stock = Number(product.stock);
      const qty   = Number(item.quantity);

      if (stock < qty) {
        // Rollback
        oldOrder.items.forEach((oldItem) => {
          const p = db.products.find((p) => p.id === oldItem.productId);
          if (p) p.stock = Number(p.stock) - Number(oldItem.quantity);
        });
        return res.status(400).json({ message: `Insufficient stock for ${product.name}` });
      }

      product.stock = stock - qty;
      totalAmount += Number(product.price) * qty;
    }

    db.orders[index] = {
      ...oldOrder,
      items: items.map((item) => ({
        productId: item.productId,
        quantity:  Number(item.quantity),
        price:     Number(db.products.find((p) => p.id === item.productId)?.price ?? item.price ?? 0),
      })),
      totalAmount,
      paymentMethod: paymentMethod ?? oldOrder.paymentMethod,
      status:        status        ?? oldOrder.status,
    };
  } else {
    // No item changes — update status / paymentMethod only
    db.orders[index] = {
      ...oldOrder,
      paymentMethod: paymentMethod ?? oldOrder.paymentMethod,
      status:        status        ?? oldOrder.status,
    };
  }

  writeDB(db);
  res.json(db.orders[index]);
});

/**
 * DELETE ORDER (ADMIN)
 */
router.delete("/:id", (req, res) => {
  const db = readDB();
  const index = db.orders.findIndex((o) => o.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ message: "Order not found" });

  const deletedOrder = db.orders.splice(index, 1)[0];
  writeDB(db);
  res.json({ message: "Order deleted", order: deletedOrder });
});

module.exports = router;