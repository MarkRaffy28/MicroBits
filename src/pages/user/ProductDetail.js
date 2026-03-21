import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../../context/CartContext";
import { useAuth } from "../../context/AuthContext";
import { getProductById } from "../../firebase/services/products";
import { addToCart } from "../../firebase/services/cart";

function ProductDetailSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="h-5 w-24 bg-gray-700 rounded mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 aspect-square" />
          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 space-y-4">
            <div className="h-8 bg-gray-700 rounded w-3/4" />
            <div className="h-4 bg-gray-700 rounded w-1/4" />
            <div className="h-10 bg-gray-700 rounded w-1/3" />
            <div className="h-6 bg-gray-700 rounded w-1/4" />
            <div className="space-y-2">
              <div className="h-4 bg-gray-700 rounded w-full" />
              <div className="h-4 bg-gray-700 rounded w-5/6" />
              <div className="h-4 bg-gray-700 rounded w-4/6" />
            </div>
            <div className="h-14 bg-gray-700 rounded w-full mt-4" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductDetail() {
  const { id }             = useParams();
  const { fetchCartCount, cartItems } = useCart();   // consume cart from context
  const { currentUser }    = useAuth();
  const location           = useLocation();
  const navigate           = useNavigate();

  const [product,  setProduct]  = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [message,  setMessage]  = useState("");
  const [loading,  setLoading]  = useState(true);
  const [adding,   setAdding]   = useState(false);

  useEffect(() => { fetchProduct(); }, [id]);

  const fetchProduct = async () => {
    try {
      const data = await getProductById(id);
      setProduct(data);
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(""), 3000);
    return () => clearTimeout(timer);
  }, [message]);

  const updateQuantity = (change) => {
    const newQty = quantity + change;
    if (newQty >= 1 && newQty <= product.stock) setQuantity(newQty);
  };

  const handleAddToCart = async () => {
    if (!currentUser) {
      setMessage("❌ Please login to add to cart");
      return;
    }
    if (Number(product.stock) === 0) {
      setMessage("❌ Product is out of stock");
      return;
    }

    // Use cartItems from context — no extra Firestore read needed
    const existingItem   = cartItems?.find((item) => item.productId === product.id);
    const currentCartQty = existingItem?.quantity ?? 0;
    const newTotalQty    = currentCartQty + quantity;

    if (newTotalQty > Number(product.stock)) {
      const remaining = Number(product.stock) - currentCartQty;
      setMessage(
        remaining <= 0
          ? `❌ You already have the maximum stock (${product.stock}) in your cart`
          : `❌ Only ${remaining} more can be added. You already have ${currentCartQty} in cart`
      );
      return;
    }

    try {
      setAdding(true);
      await addToCart(currentUser.id, product.id, quantity);
      await fetchCartCount();
      setMessage("✅ Added to cart!");
      setQuantity(1);
    } catch (err) {
      setMessage(`❌ ${err.message || "Failed to add to cart. Please try again."}`);
    } finally {
      setAdding(false);
    }
  };

  // Skeleton renders immediately — LCP element is no longer blocked by fetch
  if (loading) return <ProductDetailSkeleton />;

  if (!product) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center">
        <i className="bi bi-exclamation-triangle text-red-500 text-6xl mb-4"></i>
        <p className="text-gray-400 text-xl mb-4">Product not found</p>
        <button onClick={() => navigate("/user/shop")}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors">
          Back to Shop
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900">
      {message && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className={`${message.includes("❌") ? "bg-red-600" : "bg-green-600"} text-white px-6 py-3 rounded-lg shadow-2xl`}>
            {message}
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button onClick={() => location.key === 'default' ? navigate("/user/shop") : navigate(-1)}
          className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
          <i className="bi bi-arrow-left"></i>
          <span>Return</span>
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden flex items-center justify-center p-8">
            {product.image ? (
              <img
                src={product.image}
                alt={product.name}
                fetchpriority="high"
                loading="eager"
                decoding="sync"
                className="max-w-full max-h-96 object-contain"
              />
            ) : (
              <div className="w-full aspect-square flex items-center justify-center bg-gray-900">
                <i className="bi bi-image text-gray-600 text-8xl"></i>
              </div>
            )}
          </div>

          <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
            <h1 className="text-3xl font-bold text-gray-100 mb-2">{product.name}</h1>
            <p className="text-sm text-gray-400 mb-4">{product.category}</p>

            <div className="mb-6">
              <span className="text-4xl font-bold text-blue-400">${product.price}</span>
            </div>

            <div className="mb-6">
              <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${
                product.stock === 0 ? "bg-red-500" :
                product.stock < 10  ? "bg-yellow-500 text-gray-900" :
                                      "bg-green-500"
              }`}>
                {product.stock === 0 ? "Out of Stock" :
                 product.stock < 10  ? `Only ${product.stock} left` : "In Stock"}
              </span>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Description</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>

            <div className="mb-6">
              <label className="block text-gray-300 text-sm font-semibold mb-2">Quantity</label>
              <div className="flex items-center gap-4">
                <button onClick={() => updateQuantity(-1)} disabled={quantity <= 1}
                  className="bg-gray-700 p-3 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300">
                  <i className="bi bi-dash text-xl"></i>
                </button>
                <span className="text-2xl font-semibold text-gray-200 min-w-[3rem] text-center">
                  {quantity}
                </span>
                <button onClick={() => updateQuantity(1)} disabled={quantity >= product.stock}
                  className="bg-gray-700 p-3 rounded-lg hover:bg-green-600 hover:text-white transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-300">
                  <i className="bi bi-plus text-xl"></i>
                </button>
              </div>
              {quantity > 1 && (
                <p className="text-sm text-green-400 mt-2">
                  Total: ${(product.price * quantity).toFixed(2)}
                </p>
              )}
            </div>

            <button
              onClick={handleAddToCart}
              disabled={product.stock === 0 || adding}
              className={`w-full py-4 rounded-lg font-semibold text-lg transition-all duration-200 ${
                product.stock === 0
                  ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                  : adding
                  ? "bg-blue-800 text-blue-300 cursor-wait"
                  : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 active:scale-95"
              }`}>
              <i className={`bi ${adding ? "bi-hourglass-split" : "bi-cart-plus"} mr-2`}></i>
              {product.stock === 0 ? "Out of Stock" : adding ? "Adding..." : "Add to Cart"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;