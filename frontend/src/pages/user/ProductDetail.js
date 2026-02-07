import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";

const API_URL = "http://localhost:5000/api/products";
const ORDERS_URL = "http://localhost:5000/api/orders";

function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    fetchProduct();
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await axios.get(API_URL);
      const foundProduct = response.data.find((p) => String(p.id) === String(id));
      setProduct(foundProduct);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching product:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(""), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const updateQuantity = (change) => {
    const newQty = quantity + change;
    if (newQty >= 1 && newQty <= Number(product.stock)) {
      setQuantity(newQty);
    }
  };

  const handleOrder = async () => {
    if (!user) {
      setMessage("❌ Please login to place an order");
      return;
    }

    if (Number(product.stock) === 0) {
      setMessage("❌ Product is out of stock");
      return;
    }

    try {
      const orderData = {
        userId: user.id,
        items: [
          {
            productId: product.id,
            quantity: quantity,
            price: Number(product.price),
          },
        ],
        paymentMethod: paymentMethod,
      };

      await axios.post(ORDERS_URL, orderData);
      setMessage("✅ Order placed successfully!");
      
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-xl">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <i className="bi bi-exclamation-triangle text-red-500 text-6xl mb-4"></i>
          <p className="text-gray-400 text-xl mb-4">Product not found</p>
          <button
            onClick={() => navigate("/user")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
          >
            Back to Shop
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Message Toast */}
      {message && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className={`${message.includes('❌') ? 'bg-red-600' : 'bg-green-600'} text-white px-6 py-3 rounded-lg shadow-2xl`}>
            {message}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate("/user")}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
        >
          <i className="bi bi-arrow-left"></i>
          <span>Back to Shop</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Image */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            {product.image ? (
              <img
                src={`http://localhost:5000${product.image}`}
                alt={product.name}
                className="w-full h-auto object-contain"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center bg-gray-900">
                <i className="bi bi-image text-gray-600 text-8xl"></i>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">
              {product.name}
            </h1>
            
            <p className="text-sm text-gray-400 mb-4">{product.category}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-blue-400">
                ${product.price}
              </span>
            </div>

            {/* Stock Status */}
            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                Number(product.stock) === 0 ? 'bg-red-500' :
                Number(product.stock) < 10 ? 'bg-yellow-500 text-gray-900' :
                'bg-green-500'
              }`}>
                {Number(product.stock) === 0 ? 'Out of Stock' : 
                Number(product.stock) < 10 ? `Only ${product.stock} left` :
                'In Stock'}
              </span>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Description</h3>
              <p className="text-gray-300 leading-relaxed">{product.description}</p>
            </div>

            {/* Quantity Selector */}
            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-semibold mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => updateQuantity(-1)}
                  disabled={quantity <= 1}
                  className="bg-gray-700 p-3 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
                >
                  <i className="bi bi-dash text-xl"></i>
                </button>
                <span className="text-2xl font-semibold text-gray-200 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button
                  onClick={() => updateQuantity(1)}
                  disabled={quantity >= Number(product.stock)}
                  className="bg-gray-700 p-3 rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300"
                >
                  <i className="bi bi-plus text-xl"></i>
                </button>
              </div>
              {quantity > 1 && (
                <p className="text-sm text-green-400 mt-2">
                  Total: ${(product.price * quantity).toFixed(2)}
                </p>
              )}
            </div>

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
                <option value="cash">Cash on Delivery</option>
                <option value="card">Credit/Debit Card</option>
                <option value="gcash">GCash</option>
                <option value="paypal">PayPal</option>
              </select>
            </div>

            {/* Order Button */}
            <button
              onClick={handleOrder}
              disabled={Number(product.stock) === 0}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                Number(product.stock) === 0
                  ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 active:scale-95'
              }`}
            >
              {Number(product.stock) === 0 ? 'Out of Stock' : 'Place Order'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;