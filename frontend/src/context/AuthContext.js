import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChange } from "../firebase/services/auth";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = still loading
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange((user) => {
      setCurrentUser(user);
      setLoading(false);

      // Keep localStorage in sync for components that read it directly
      if (user) {
        localStorage.setItem("user", JSON.stringify(user));
      } else {
        localStorage.removeItem("user");
      }
    });

    return unsubscribe;
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isLoggedIn = !!currentUser;

  return (
    <AuthContext.Provider value={{ currentUser, isAdmin, isLoggedIn, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};