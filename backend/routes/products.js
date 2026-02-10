const express = require("express");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const sharp = require("sharp");

const router = express.Router();
const dbPath = path.join(__dirname, "../data/db.json");
const imagesPath = path.join(__dirname, "../data/images/products");

// Ensure images folder exists
if (!fs.existsSync(imagesPath)) fs.mkdirSync(imagesPath, { recursive: true });

// Helper functions
const readDB = () => JSON.parse(fs.readFileSync(dbPath));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// Delete old images for a product
const deleteOldImages = (productId) => {
  const files = fs.readdirSync(imagesPath);
  files.forEach((file) => {
    if (file.startsWith(productId + ".")) {
      fs.unlinkSync(path.join(imagesPath, file));
    }
  });
};

// Multer setups
const uploadMemory = multer({ storage: multer.memoryStorage() });

const updateStorage = multer.memoryStorage(); // use memory again, we'll handle saving after sharp
const uploadForUpdate = multer({ storage: updateStorage });

// Get product image path
const getProductImage = (productId) => {
  const file = path.join(imagesPath, `${productId}.webp`);
  return fs.existsSync(file) ? `/data/images/products/${productId}.webp` : null;
};

// Function to save image as webp
const saveImageWebp = async (buffer, productId) => {
  const filepath = path.join(imagesPath, `${productId}.webp`);
  await sharp(buffer)
    .webp({ quality: 80 })
    .toFile(filepath);
};

// GET /products
router.get("/", (req, res) => {
  const db = readDB();
  const products = (db.products || []).map((p) => ({
    ...p,
    image: getProductImage(p.id),
  }));
  res.json(products);
});

// GET /products/:id
router.get("/:id", (req, res) => {
  const db = readDB();
  const product = (db.products || []).find(
    (p) => p.id === Number(req.params.id)
  );

  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  res.json({
    ...product,
    image: getProductImage(product.id),
  });
});


// POST /products
router.post("/", uploadMemory.single("image"), async (req, res) => {
  const db = readDB();
  const { id, name, category, description, price, stock } = req.body;

  if (!name || !category || !description || !price || !stock) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const newProduct = { id, name, category, description, price, stock };

  ["id", "price", "stock"].forEach((key) => {
    if (newProduct[key] !== undefined) {
      newProduct[key] = Number(newProduct[key]);
    }
  });

  // save image as webp
  if (req.file) {
    deleteOldImages(id);
    await saveImageWebp(req.file.buffer, id);
  }

  db.products.push(newProduct);
  writeDB(db);

  res.status(201).json({ ...newProduct, image: getProductImage(id) });
});

// PUT /products/:id
router.put("/:id", uploadForUpdate.single("image"), async (req, res) => {
  const db = readDB();
  const id = Number(req.params.id);
  const productIndex = db.products.findIndex((p) => p.id === id);

  if (productIndex === -1) return res.status(404).json({ message: "Product not found" });

  const updatedProduct = { ...db.products[productIndex], ...req.body, id };

  ["price", "stock"].forEach((key) => {
    if (updatedProduct[key] !== undefined) {
      updatedProduct[key] = Number(updatedProduct[key]);
    }
  });

  if (req.file) {
    deleteOldImages(id);
    await saveImageWebp(req.file.buffer, id);
  }

  db.products[productIndex] = updatedProduct;
  writeDB(db);

  res.json({ ...updatedProduct, image: getProductImage(id) });
});

// DELETE /products/:id
router.delete("/:id", (req, res) => {
  const db = readDB();
  const id  = Number(req.params.id);

  const productIndex = db.products.findIndex((p) => p.id === id);
  if (productIndex === -1) return res.status(404).json({ message: "Product not found" });

  deleteOldImages(id);
  const deleted = db.products.splice(productIndex, 1);
  writeDB(db);

  res.json({ message: "Product deleted", product: deleted[0] });
});

module.exports = router;
