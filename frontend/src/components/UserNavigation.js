import { useEffect, useState } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import axios from "axios";

import { ReactComponent as Logo } from "../assets/logo.svg";
import { ReactComponent as Burger } from "../assets/burger.svg";
import { useCart } from "../context/CartContext";

const CART_URL = "http://localhost:5000/api/cart";

function UserNavigation() {
  const [isOpen, setIsOpen] = useState(false);
  const { cartCount } = useCart();

  const location = useLocation();
  const activePath = location.pathname;

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  useEffect(() => {
    if (user) {
      fetchCartCount();
    }
  }, []);

  const fetchCartCount = async () => {
    try {
      const response = await axios.get(`${CART_URL}/${user.id}`);
      const total = response.data.reduce((sum, item) => sum + item.quantity, 0);
    } catch (error) {
      console.error("Error fetching cart:", error);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const navItems = [
    { path: "/user", label: "Home" },
    { path: "/user/shop", label: "Shop" },
    { path: "/user/orders/all", label: "Orders" },
    { path: "/user/profile", label: "Profile" },
  ];

  const getNavLinkClasses = (path, isMobile = false) => {
    const isActive = activePath === path;
    
    if (isMobile) {
      return `block px-4 py-3 rounded-lg font-medium transition-all duration-200 ${
        isActive
          ? "bg-blue-500/20 text-white/90 border-l-4 border-blue-400"
          : "text-white/80 hover:bg-white/10 hover:text-white"
      }`;
    }
    
    return `relative font-medium transition-all duration-200 ${
      isActive
        ? "text-white"
        : "text-white/80 hover:text-white"
    }`;
  };

  const getUnderlineClasses = (path) => {
    const isActive = activePath === path;
    return `absolute -bottom-0 left-0 h-0.5 bg-white transition-all duration-300 ${
      isActive ? "w-full" : "w-0 group-hover:w-full"
    }`;
  };

  return (
    <nav className="sticky top-0 z-50 bg-gradient-to-r from-blue-700 to-blue-800 shadow-lg">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <NavLink 
            to="/user" 
            className="flex items-center gap-3 text-white no-underline group transition-transform hover:scale-105"
          >
            <div className="bg-white/10 p-2 rounded-lg backdrop-blur-sm group-hover:bg-white/20 transition-colors">
              <Logo className="inline" height="26" />
            </div>
            <span className="font-bold text-xl tracking-tight">MicroBits</span>
          </NavLink>

          {/* Desktop Navigation */}
          <div className="hidden w-full ml-8 md:flex justify-between items-center gap-8">
            <div className="flex items-center gap-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`${getNavLinkClasses(item.path)} group no-underline`}
                >
                  {item.label}
                  <span className={getUnderlineClasses(item.path)}></span>
                </NavLink>
              ))}
            </div>
            
            <div className="flex items-center gap-6">
              <button
                onClick={() => navigate("/user/cart")}
                className="relative bg-white/10 hover:bg-white/20 text-white p-[6px] rounded-lg transition-all duration-200"
              >
                <i className="bi bi-cart3 text-2xl"></i>
                {cartCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {cartCount}
                  </span>
                )}
              </button>
              <button
                onClick={handleLogout}
                className="bg-red-500/90 hover:bg-red-600 text-white font-medium px-3 py-1 rounded-lg transition-all duration-200 hover:shadow-lg hover:shadow-red-500/30"
              >
                Logout
              </button>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/user/cart")}
              className="md:hidden relative bg-white/10 hover:bg-white/20 text-white p-[6px] rounded-lg transition-all duration-200"
            >
              <i className="bi bi-cart3 text-2xl"></i>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile menu button */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden text-white p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="Toggle menu"
            >
              <Burger height="24" />
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isOpen ? "max-h-96 pb-4" : "max-h-0"
          }`}
        >
          <div className="flex flex-col gap-2 pt-4 border-t border-white/20">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={`${getNavLinkClasses(item.path, true)} no-underline`}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            
            <button
              onClick={handleLogout}
              className="mt-2 w-full bg-red-500/90 hover:bg-red-600 text-white font-medium px-3 py-1 rounded-lg transition-all duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

export default UserNavigation;