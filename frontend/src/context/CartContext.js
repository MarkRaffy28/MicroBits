import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";

const CART_URL = "http://localhost:5000/api/cart";
const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const user = JSON.parse(localStorage.getItem("user"));

  const fetchCartCount = async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    const res = await axios.get(`${CART_URL}/${user.id}`);
    const total = res.data.reduce((sum, i) => sum + i.quantity, 0);
    setCartCount(total);
  };

  useEffect(() => {
    fetchCartCount();
  }, []);

  return (
    <CartContext.Provider value={{ cartCount, fetchCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
