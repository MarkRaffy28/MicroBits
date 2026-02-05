const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();
const dbPath = path.join(__dirname, "../data/db.json");

// Helper functions
const readDB = () => JSON.parse(fs.readFileSync(dbPath));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// GET /products - fetch all products
router.get("/", (req, res) => {
  const db = readDB();
  res.json(db.products || []);
});

// POST /products - add a new product
router.post("/", (req, res) => {
  const db = readDB();
  const { id, name, category, description, price, stock } = req.body;

  if (!name || !category || !description || !price || !stock) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newProduct = {
    id: id || Date.now().toString(),
    name,
    category,
    description,
    price,
    stock,
  };

  db.products.push(newProduct);
  writeDB(db);

  res.status(201).json(newProduct);
});

// PUT /products/:id - edit a product
router.put("/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;
  const productIndex = db.products.findIndex((p) => p.id === id);

  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  db.products[productIndex] = { id, ...req.body };
  writeDB(db);

  res.json(db.products[productIndex]);
});

// DELETE /products/:id - delete a product
router.delete("/:id", (req, res) => {
  const db = readDB();
  const { id } = req.params;

  const productIndex = db.products.findIndex((p) => p.id === id);
  if (productIndex === -1) {
    return res.status(404).json({ message: "Product not found" });
  }

  const deleted = db.products.splice(productIndex, 1);
  writeDB(db);

  res.json({ message: "Product deleted", product: deleted[0] });
});

module.exports = router;
