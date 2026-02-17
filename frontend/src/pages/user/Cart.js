import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useCart } from "../../context/CartContext";

const CART_URL = "http://localhost:5000/api/cart";
const PRODUCTS_URL = "http://localhost:5000/api/products";
const ORDERS_URL = "http://localhost:5000/api/orders";

function Cart() {
  const navigate = useNavigate();
  const [cart, setCart] = useState([]);
  const [products, setProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const { fetchCartCount } = useCart();

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }
    fetchCartAndProducts();
  }, []);

  useEffect(() => {
    const correctCartQuantities = async () => {
      let needsUpdate = false;

      for (const item of cart) {
        const product = getProductDetails(item.productId);
        if (product && item.quantity > product.stock) {
          needsUpdate = true;
          try {
            await axios.put(`${CART_URL}/${user.id}`, {
              productId: item.productId,
              quantity: product.stock,
            });
          } catch (error) {
            console.error("Error auto-correcting cart quantity:", error);
          }
        }
      }

      if (needsUpdate) {
        await fetchCartAndProducts();
        setMessage("⚠️ Some quantities were adjusted to match available stock");
      }
    };

    if (cart.length > 0 && products.length > 0) {
      correctCartQuantities();
    }
  }, [cart.length, products.length]);

  const fetchCartAndProducts = async () => {
    try {
      const [cartRes, productsRes] = await Promise.all([
        axios.get(`${CART_URL}/${user.id}`),
        axios.get(PRODUCTS_URL),
      ]);

      setCart(cartRes.data);
      setProducts(productsRes.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getProductDetails = (productId) => {
    return products.find((p) => String(p.id) === String(productId));
  };

  const handleProductClick = (productId) => {
    navigate(`/user/product/${productId}`);
  };

  const updateCartQuantity = async (productId, newQuantity) => {
    const product = getProductDetails(productId);

    if (newQuantity > product.stock) {
      setMessage(`❌ Not enough stock! Only ${product.stock} available`);
      return;
    }

    if (newQuantity < 1) return;

    try {
      await axios.put(`${CART_URL}/${user.id}`, {
        productId,
        quantity: newQuantity,
      });
      await fetchCartAndProducts();
      fetchCartCount();
    } catch (error) {
      console.error("Error updating cart:", error);
      setMessage("❌ Failed to update cart");
    }
  };

  const removeFromCart = async (productId) => {
    try {
      await axios.delete(`${CART_URL}/${user.id}/${productId}`);
      await fetchCartAndProducts();
      setMessage("🗑️ Item removed from cart");
      fetchCartCount();
    } catch (error) {
      console.error("Error removing from cart:", error);
      setMessage("❌ Failed to remove item");
    }
  };

  const placeOrder = async () => {
    if (cart.length === 0) {
      setMessage("❌ Your cart is empty!");
      return;
    }

    for (const item of cart) {
      const product = getProductDetails(item.productId);
      if (!product) {
        setMessage(`❌ Product not found`);
        return;
      }
      if (item.quantity > Number(product.stock)) {
        setMessage(
          `❌ ${product.name}: Only ${product.stock} available, but you have ${item.quantity} in cart`,
        );
        return;
      }
    }

    try {
      const orderItems = cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: getProductDetails(item.productId).price,
      }));

      const orderData = {
        userId: user.id,
        items: orderItems,
        paymentMethod: paymentMethod,
      };

      await axios.post(ORDERS_URL, orderData);

      // Clear cart after successful order
      await axios.delete(`${CART_URL}/${user.id}`);
      fetchCartCount();

      setMessage("✅ Order placed successfully!");
      setCart([]);

      setTimeout(() => {
        navigate("/user");
      }, 1500);
    } catch (error) {
      console.error("Error placing order:", error);
      if (error.response?.data?.message) {
        setMessage(`❌ ${error.response.data.message}`);
      } else {
        setMessage("❌ Failed to place order. Please try again.");
      }
    }
  };

  const getTotalItems = () => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  };

  const getTotalPrice = () => {
    return cart.reduce((sum, item) => {
      const product = getProductDetails(item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Message Toast */}
      {message && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div
            className={`${message.includes("❌") ? "bg-red-600" : "bg-green-600"} text-white px-6 py-3 rounded-lg shadow-2xl`}
          >
            {message}
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-100">Shopping Cart</h1>
          <button
            onClick={() => navigate("/user/shop")}
            className="flex items-center gap-2 text-gray-400 hover:text-white mt-2 transition-colors"
          >
            <i className="bi bi-arrow-left"></i>
            <span>Back to Shop</span>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <i className="bi bi-cart3 text-gray-600 text-8xl mb-4"></i>
            <p className="text-gray-400 text-xl mb-6">Your cart is empty</p>
            <button
              onClick={() => navigate("/user")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="space-y-4 mb-6">
              {cart.map((item) => {
                const product = getProductDetails(item.productId);
                if (!product) return null;

                return (
                  <div
                    key={item.productId}
                    className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4 hover:border-blue-500/50 transition-colors"
                  >
                    {product.image ? (
                      <img
                        src={`http://localhost:5000${product.image}`}
                        alt={product.name}
                        className="w-24 h-24 object-cover rounded-lg border border-gray-700"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center">
                        <i className="bi bi-image text-gray-600 text-3xl"></i>
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      <h3
                        onClick={() => handleProductClick(product.id)}
                        className="font-semibold text-gray-100 text-lg mb-1 cursor-pointer hover:text-blue-400 transition-colors"
                      >
                        {product.name}
                      </h3>
                      <p className="text-sm text-gray-400 mb-2">
                        {product.category}
                      </p>
                      <p className="text-blue-400 font-bold text-xl">
                        ${product.price}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        onClick={() =>
                          updateCartQuantity(item.productId, item.quantity - 1)
                        }
                        className="bg-gray-700 p-2 rounded-lg hover:bg-red-600 hover:text-white transition-all text-gray-300"
                      >
                        <i className="bi bi-dash text-lg"></i>
                      </button>
                      <span className="text-xl font-semibold text-gray-200 min-w-[2rem] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateCartQuantity(item.productId, item.quantity + 1)
                        }
                        className="bg-gray-700 p-2 rounded-lg hover:bg-green-600 hover:text-white transition-all text-gray-300"
                      >
                        <i className="bi bi-plus text-lg"></i>
                      </button>
                    </div>

                    <div className="min-w-20 text-right">
                      <p className="text-lg font-bold text-gray-200 mb-2">
                        ${(product.price * item.quantity).toFixed(2)}
                      </p>
                      <button
                        onClick={() => removeFromCart(item.productId)}
                        className="text-red-500 hover:text-red-400 transition-colors"
                      >
                        <i className="bi bi-trash text-xl"></i>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
              <h2 className="text-xl font-bold text-gray-100 mb-4">
                Order Summary
              </h2>

              {/* Payment Method */}
              <div className="mb-6">
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  Payment Method
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="GCash">GCash</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              <div className="flex justify-between items-center mb-3 text-gray-300">
                <span>Items ({getTotalItems()}):</span>
                <span className="font-semibold">
                  ${getTotalPrice().toFixed(2)}
                </span>
              </div>

              <div className="border-t border-gray-700 pt-3 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-gray-200">
                    Total:
                  </span>
                  <span className="text-3xl font-bold text-blue-400">
                    ${getTotalPrice().toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                onClick={placeOrder}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold text-lg shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 active:scale-95"
              >
                Place Order
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;
