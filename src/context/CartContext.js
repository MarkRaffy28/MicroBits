import { createContext, useContext, useState, useEffect } from "react";
import { useAuth } from "./AuthContext";
import { getCart } from "../firebase/services/cart";

const CartContext = createContext();

export function CartProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [cartItems, setCartItems] = useState([]);
  const { currentUser } = useAuth();

  const fetchCartCount = async () => {
    if (!currentUser) {
      setCartCount(0);
      setCartItems([]);
      return;
    }

    try {
      const cart  = await getCart(currentUser.id);
      setCartItems(cart);
      setCartCount(cart.reduce((sum, i) => sum + i.quantity, 0));
    } catch {
      setCartCount(0);
      setCartItems([]);
    }
  };

  useEffect(() => {
    fetchCartCount();
  }, [currentUser]);

  return (
    <CartContext.Provider value={{ cartCount, cartItems, fetchCartCount }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);