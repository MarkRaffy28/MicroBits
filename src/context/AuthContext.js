import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChange } from "../firebase/services/auth";
import { doc, updateDoc } from "firebase/firestore";
import { auth, db } from "../firebase/config";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(undefined); // undefined = still loading
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChange(async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user && auth.currentUser?.emailVerified) {
        try {
          await updateDoc(doc(db, "users", auth.currentUser.uid), {
            emailVerified: true,
          });
        } catch {}
      } else {
        localStorage.removeItem("user");
      }
    });

    return unsubscribe;
  }, []);

  const isAdmin = currentUser?.role === "admin";
  const isLoggedIn = !!currentUser;

  return (
    <AuthContext.Provider value={{ currentUser, setCurrentUser, isAdmin, isLoggedIn, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};