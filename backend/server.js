const cors = require("cors");
const express = require("express");
const path = require("path");
const authRoutes = require("./routes/auth");
const cartRoutes = require("./routes/cart");
const orderRoutes = require("./routes/orders");
const productRoutes = require("./routes/products");
const userRoutes = require("./routes/users");

const app = express();

app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/products", productRoutes);
app.use("/api/users", userRoutes);

app.use("/data/images/products", express.static(path.join(__dirname, "data/images/products")));
app.use("/data/images/users", express.static(path.join(__dirname, "data/images/users")));


const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
