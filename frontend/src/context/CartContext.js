import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getCart } from "../firebase/services/cart";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const { currentUser } = useAuth();

  const fetchCartCount = async () => {
    if (!currentUser) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await getCart(currentUser.id);
      const total = cart.reduce((sum, i) => sum + i.quantity, 0);
      setCartCount(total);
    } catch {
      // User not found or no cart — treat as empty
      setCartCount(0);
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [currentUser]);

  return (
    <CartContext.Provider value={{ cartCount, fetchCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);