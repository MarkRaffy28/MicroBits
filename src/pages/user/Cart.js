import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { getAllProducts } from "../../firebase/services/products";
import { getCart, updateCartItem, removeFromCart, clearCart } from "../../firebase/services/cart";
import { createOrder } from "../../firebase/services/orders";

function CartSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-pulse">
        <div className="flex items-center justify-between mb-6">
          <div className="h-8 w-48 bg-gray-700 rounded" />
          <div className="h-5 w-24 bg-gray-700 rounded" />
        </div>
        <div className="space-y-4 mb-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-800 border border-gray-700 rounded-lg p-4 flex items-center gap-4">
              <div className="w-5 h-5 bg-gray-700 rounded" />
              <div className="w-16 h-16 sm:w-24 sm:h-24 bg-gray-700 rounded-lg flex-shrink-0" />
              <div className="flex-1 space-y-2 min-w-0">
                <div className="h-5 bg-gray-700 rounded w-3/4" />
                <div className="h-5 bg-gray-700 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 space-y-4">
          <div className="h-6 bg-gray-700 rounded w-1/3" />
          <div className="h-12 bg-gray-700 rounded" />
          <div className="h-12 bg-gray-700 rounded" />
          <div className="h-5 bg-gray-700 rounded" />
          <div className="h-14 bg-gray-700 rounded" />
        </div>
      </div>
    </div>
  );
}

function Cart() {
  const navigate           = useNavigate();
  const { currentUser }    = useAuth();
  const { fetchCartCount } = useCart();
  const { addToast }       = useToast();

  const [cart,          setCart]          = useState([]);
  const [products,      setProducts]      = useState([]);
  const [selectedIds,   setSelectedIds]   = useState(new Set());
  const [paymentMethod, setPaymentMethod] = useState("Cash on Delivery");
  const [loading,       setLoading]       = useState(true);
  const [placingOrder,  setPlacingOrder]  = useState(false);

  useEffect(() => {
    if (!currentUser) { navigate("/"); return; }
    fetchCartAndProducts();
  }, []);

  useEffect(() => {
    if (!cart.length || !products.length) return;

    const correctQuantities = async () => {
      const overStocked = cart.filter((item) => {
        const product = getProductDetails(item.productId);
        return product && item.quantity > product.stock;
      });

      if (!overStocked.length) return;

      await Promise.all(
        overStocked.map((item) => {
          const product = getProductDetails(item.productId);
          return updateCartItem(currentUser.id, item.productId, product.stock);
        })
      );

      await fetchCartAndProducts();
      addToast("⚠️ Some quantities were adjusted to match available stock");
    };

    correctQuantities();
  }, [cart.length, products.length]);

  const fetchCartAndProducts = async () => {
    try {
      const [cartData, productsData] = await Promise.all([
        getCart(currentUser.id),
        getAllProducts(),
      ]);
      setCart(cartData);
      setProducts(productsData);
      setSelectedIds(new Set(cartData.map((i) => i.productId)));
    } catch (err) {
      console.error("Error fetching cart data:", err);
    } finally {
      setLoading(false);
    }
  };

  const getProductDetails = (productId) => products.find((p) => p.id === productId);

  const allSelected  = cart.length > 0 && cart.every((i) => selectedIds.has(i.productId));
  const someSelected = cart.some((i) => selectedIds.has(i.productId));

  const toggleItem = (productId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(cart.map((i) => i.productId)));
  };

  const selectedCart = cart.filter((i) => selectedIds.has(i.productId));

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;
    const product = getProductDetails(productId);
    if (newQuantity > product.stock) {
      addToast(`❌ Not enough stock! Only ${product.stock} available`);
      return;
    }
    try {
      const updatedCart = await updateCartItem(currentUser.id, productId, newQuantity);
      setCart(updatedCart);
      fetchCartCount();
    } catch {
      addToast("❌ Failed to update cart");
    }
  };

  const handleRemoveFromCart = async (productId) => {
    try {
      const updatedCart = await removeFromCart(currentUser.id, productId);
      setCart(updatedCart);
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(productId); return next; });
      addToast("🗑️ Item removed from cart");
      fetchCartCount();
    } catch {
      addToast("❌ Failed to remove item");
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedCart.length) {
      addToast("❌ Please select at least one item to order");
      return;
    }

    for (const item of selectedCart) {
      const product = getProductDetails(item.productId);
      if (!product) { addToast("❌ Product not found"); return; }
      if (item.quantity > Number(product.stock)) {
        addToast(`❌ ${product.name}: Only ${product.stock} available, but you have ${item.quantity} in cart`);
        return;
      }
    }

    try {
      setPlacingOrder(true);

      await createOrder(
        currentUser.id,
        selectedCart.map((item) => ({
          productId: item.productId,
          quantity:  item.quantity,
          price:     getProductDetails(item.productId).price,
        })),
        paymentMethod,
      );

      const remainingCart = await Promise.all(
        selectedCart.map((item) => removeFromCart(currentUser.id, item.productId))
      );
      const finalCart = remainingCart[remainingCart.length - 1] ?? [];
      setCart(finalCart);
      setSelectedIds(new Set(finalCart.map((i) => i.productId)));

      fetchCartCount();
      addToast("✅ Order placed successfully!");
      setTimeout(() => navigate("/user/orders/all"), 1500);
    } catch (err) {
      addToast(`❌ ${"Failed to place order. Please try again."}`);
    } finally {
      setPlacingOrder(false);
    }
  };

  const getTotalItems = () => selectedCart.reduce((sum, i) => sum + i.quantity, 0);
  const getTotalPrice = () =>
    selectedCart.reduce((sum, item) => {
      const product = getProductDetails(item.productId);
      return sum + (product ? product.price * item.quantity : 0);
    }, 0);

  if (loading) return <CartSkeleton />;

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-100">Shopping Cart</h1>
          <button onClick={() => navigate("/user/shop")}
            className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors text-sm sm:text-base">
            <i className="bi bi-arrow-left" />
            <span className="hidden xs:inline">Back to Shop</span>
            <span className="xs:hidden">Shop</span>
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-20">
            <i className="bi bi-cart3 text-gray-600 text-8xl mb-4" />
            <p className="text-gray-400 text-xl mb-6">Your cart is empty</p>
            <button onClick={() => navigate("/user")}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors">
              Continue Shopping
            </button>
          </div>
        ) : (
          <>
            {/* Select all row */}
            <div className="flex items-center gap-3 bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 mb-3">
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = !allSelected && someSelected; }}
                onChange={toggleAll}
                className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0"
              />
              <span className="text-gray-300 text-sm font-medium">
                Select All ({cart.length} item{cart.length !== 1 ? "s" : ""})
              </span>
              {someSelected && (
                <span className="ml-auto text-gray-400 text-sm whitespace-nowrap">
                  {selectedIds.size} selected
                </span>
              )}
            </div>

            {/* Cart items */}
            <div className="space-y-3 mb-6">
              {cart.map((item) => {
                const product = getProductDetails(item.productId);
                const checked = selectedIds.has(item.productId);
                if (!product) return null;

                return (
                  <div key={item.productId}
                    onClick={() => toggleItem(item.productId)}
                    className={`bg-gray-800 border rounded-lg p-3 sm:p-4 transition-all duration-200 cursor-pointer ${
                      checked
                        ? "border-blue-500/60 shadow-md shadow-blue-500/10"
                        : "border-gray-700 opacity-60 hover:opacity-80"
                    }`}>

                    {/* Main row: checkbox | image | center | right */}
                    <div className="flex items-center gap-3">
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleItem(item.productId)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-4 h-4 accent-blue-500 cursor-pointer flex-shrink-0"
                      />

                      {/* Image */}
                      <div className="flex-shrink-0"
                        onClick={(e) => { e.stopPropagation(); navigate(`/user/product/${product.id}`, { state: { product } }); }}>
                        {product.image ? (
                          <img src={product.image} alt={product.name}
                            className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg border border-gray-700 cursor-pointer" />
                        ) : (
                          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-900 border border-gray-700 rounded-lg flex items-center justify-center cursor-pointer">
                            <i className="bi bi-image text-gray-600 text-2xl" />
                          </div>
                        )}
                      </div>

                      {/* Center: name on top, price + qty below */}
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center gap-3 mb-2">
                          <h3
                            onClick={(e) => { e.stopPropagation(); navigate(`/user/product/${product.id}`, { state: { product } }); }}
                            className="font-semibold text-gray-100 text-sm sm:text-base leading-snug cursor-pointer hover:text-blue-400 transition-colors truncate">
                            {product.name}
                          </h3>
                          <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={() => handleRemoveFromCart(item.productId)}
                              className="text-red-500 hover:text-red-400 transition-colors p-0.5">
                              <i className="bi bi-trash text-base" />
                            </button>
                          </div>
                        </div>

                        {/* Price + quantity side by side */}
                        <div className="flex justify-between items-center gap-3" onClick={(e) => e.stopPropagation()}>
                          <p className="text-blue-400 font-bold text-base sm:text-lg flex-shrink-0">
                            ${product.price}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-700 rounded-md hover:bg-red-600 hover:text-white transition-all text-gray-300">
                              <i className="bi bi-dash text-sm" />
                            </button>
                            <span className="text-sm sm:text-base font-semibold text-gray-200 min-w-[1.5rem] text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= product.stock}
                              className="w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center bg-gray-700 rounded-md hover:bg-green-600 hover:text-white transition-all text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
                              <i className="bi bi-plus text-sm" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Subtotal row */}
                    <div className="flex justify-end mt-1.5 pr-0.5" onClick={(e) => e.stopPropagation()}>
                      <p className="text-sm sm:text-base font-bold text-gray-200">
                        ${(product.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order summary */}
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-bold text-gray-100 mb-4">Order Summary</h2>

              {/* Delivery address */}
              <div className="mb-5">
                <label className="block text-gray-300 text-sm font-semibold mb-2">
                  <i className="bi bi-geo-alt mr-1" />Delivery Address
                </label>
                {currentUser?.address ? (
                  <div className="bg-gray-700/60 border border-gray-600 rounded-lg px-4 py-3 text-gray-200 text-sm">
                    {currentUser.address}
                  </div>
                ) : (
                  <div className="bg-gray-700/40 border border-dashed border-gray-600 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-gray-500 text-sm italic">No address on file</span>
                    <button onClick={() => navigate("/user/profile")}
                      className="text-blue-400 hover:text-blue-300 text-sm transition-colors whitespace-nowrap">
                      Add address →
                    </button>
                  </div>
                )}
              </div>

              {/* Payment method */}
              <div className="mb-5">
                <label className="block text-gray-300 text-sm font-semibold mb-2">Payment Method</label>
                <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm sm:text-base">
                  <option value="Cash on Delivery">Cash on Delivery</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Debit Card">Debit Card</option>
                  <option value="GCash">GCash</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              <div className="flex justify-between items-center mb-3 text-gray-300 text-sm sm:text-base">
                <span>Selected Items ({getTotalItems()}):</span>
                <span className="font-semibold">${getTotalPrice().toFixed(2)}</span>
              </div>

              <div className="border-t border-gray-700 pt-3 mb-5">
                <div className="flex justify-between items-center">
                  <span className="text-base sm:text-lg font-semibold text-gray-200">Total:</span>
                  <span className="text-2xl sm:text-3xl font-bold text-blue-400">${getTotalPrice().toFixed(2)}</span>
                </div>
              </div>

              <button onClick={handlePlaceOrder} disabled={placingOrder || !someSelected}
                className={`w-full py-3.5 sm:py-4 rounded-lg font-semibold text-base sm:text-lg transition-all duration-200 ${
                  !someSelected
                    ? "bg-gray-700 text-gray-500 cursor-not-allowed"
                    : placingOrder
                    ? "bg-blue-800 text-blue-300 cursor-wait"
                    : "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-blue-500/50 transform hover:scale-105 active:scale-95"
                }`}>
                <i className={`bi ${placingOrder ? "bi-hourglass-split" : "bi-bag-check"} mr-2`} />
                {placingOrder
                  ? "Placing Order..."
                  : !someSelected
                  ? "Select items to order"
                  : `Place Order (${selectedIds.size})`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default Cart;