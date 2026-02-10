import React, { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";

const navItems = [
  {
    label: "Dashboard",
    path: "/admin",
    icon: "bi-house",
  },
  {
    label: "Users",
    path: "/admin/users",
    icon: "bi-person",
    submenu: [
      { label: "All Users", path: "/admin" },
    ],
  },
  {
    label: "Products",
    path: "/admin/products",
    icon: "bi-box-seam",
  },
  {
    label: "Orders",
    path: "/admin/all_orders",
    icon: "bi-truck",
    submenu: [
      { label: "All Orders", path: "/admin/all_orders" },
      { label: "Pending Orders", path: "/admin/pending_orders" },
      { label: "Completed Orders", path: "/admin/completed_orders" }
    ],
  },
];

function AdminSidebar({ isOpen, onClose }) {
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const location = useLocation();
  const activePath = location.pathname;
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  };

  const toggleSubmenu = (menu) =>
    setOpenSubmenu(openSubmenu === menu ? null : menu);

  // Check if any submenu item is active
  const isSubmenuActive = (submenu) => {
    return submenu?.some((sub) => activePath === sub.path);
  };

  const getNavLinkClasses = (path) =>
    `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
      activePath === path
        ? "text-blue-400 font-bold hover:text-white hover:bg-blue-600"
        : "hover:bg-blue-600"
    }`;

  const getSubmenuClasses = (path, submenu) => {
    const isActive = activePath === path || isSubmenuActive(submenu);
    return `w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
      isActive
        ? "text-blue-400 font-bold hover:text-white hover:bg-blue-600"
        : "hover:bg-blue-600"
    }`;
  };

  const getSubmenuNavLinkClasses = (path) =>
    `block px-4 py-2 text-sm rounded-lg transition-colors ${
      activePath === path
        ? "text-blue-400 font-bold hover:text-white hover:bg-blue-600"
        : "hover:bg-blue-600"
    }`;

  const getNavIcon = (path, icon, submenu) => {
    const isActive = activePath === path || isSubmenuActive(submenu);
    return isActive ? `${icon}-fill` : icon;
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-60 bg-gray-800 border-r border-gray-600 text-white transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 bg-blue-700">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-blue-600 transition-colors"
            >
              <i className="bi bi-x-lg text-xl" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <ul className="space-y-1 px-3">
              {navItems.map((item) =>
                item.submenu ? (
                  <li key={item.path}>
                    <button
                      onClick={() => toggleSubmenu(item.path)}
                      className={getSubmenuClasses(item.path, item.submenu)}
                    >
                      <div className="flex items-center gap-3">
                        <i
                          className={`bi ${getNavIcon(
                            item.path,
                            item.icon,
                            item.submenu
                          )} text-lg flex-shrink-0`}
                        />
                        <span>{item.label}</span>
                      </div>
                      <i
                        className={`bi ${
                          openSubmenu === item.path
                            ? "bi-chevron-down"
                            : "bi-chevron-right"
                        } flex-shrink-0`}
                      />
                    </button>
                    {openSubmenu === item.path && (
                      <ul className="mt-1 ml-9 space-y-1">
                        {item.submenu.map((sub) => (
                          <NavLink
                            key={sub.path}
                            to={sub.path}
                            className={getSubmenuNavLinkClasses(sub.path)}
                            onClick={onClose}
                          >
                            {sub.label}
                          </NavLink>
                        ))}
                      </ul>
                    )}
                  </li>
                ) : (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={getNavLinkClasses(item.path)}
                      onClick={onClose}
                    >
                      <i
                        className={`bi ${getNavIcon(
                          item.path,
                          item.icon
                        )} text-lg flex-shrink-0`}
                      />
                      <span>{item.label}</span>
                    </NavLink>
                  </li>
                )
              )}
            </ul>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-600">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:text-white hover:bg-red-600 transition-colors"
            >
              <i className="bi bi-box-arrow-right text-lg flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;