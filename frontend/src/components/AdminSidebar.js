import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { NavLink } from 'react-router-dom';
import { faClipboard, faChevronDown, faChevronRight, faHouse, faUser, faX, faRightFromBracket,  } from '@fortawesome/free-solid-svg-icons';
import { faClipboard as faClipboardRegular, faHouse as faHouseRegular, faUser as faUserRegular } from '@fortawesome/free-regular-svg-icons';

function AdminSidebar({ isOpen, onClose, activePath }) {
  const [openSubmenu, setOpenSubmenu] = useState(null);

  const toggleSubmenu = (menu) => {
    setOpenSubmenu(openSubmenu === menu ? null : menu);
  };

  const getNavLinkClasses = (path) =>
  `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
    activePath === path
      ? "text-blue-400 font-bold hover:text-white hover:bg-blue-600"
      : "hover:bg-blue-600"
  }`;

  const getSubmenuClasses = (path) =>
  `w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg transition-colors ${
    activePath === path
      ? "text-blue-400 font-bold hover:text-white hover:bg-blue-600"
      : "hover:bg-blue-600"
  }`;

  const getSubmenuNavLinkClasses = (path) =>
  `block px-4 py-2 text-sm rounded-lg rounded-lg transition-colors ${
    activePath === path
      ? "text-blue-400 font-bold hover:text-white hover:bg-blue-600"
      : "hover:bg-blue-600"
  }`;

  const getNavIcon = (path, solidIcon, regularIcon) =>
    activePath === path ? solidIcon : regularIcon;


  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
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
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-4 bg-blue-700">
            <h1 className="text-xl font-bold">Admin Panel</h1>
            <button
              onClick={onClose}
              className="lg:hidden p-1 rounded-md hover:bg-blue-600 transition-colors"
            >
              <FontAwesomeIcon icon={faX} size={24} />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto py-4 ">
            <ul className="space-y-1 px-3">
              <li>
                <NavLink
                  to="/admin"
                  className={getNavLinkClasses("/admin")}
                  onClick={onClose}
                >
                  <FontAwesomeIcon icon={getNavIcon("/admin", faHouse, faHouseRegular)} size={20} className="flex-shrink-0" />
                  <span>Dashboard</span>
                </NavLink>
              </li>
              <li>
                <button
                  onClick={() => toggleSubmenu('users')}
                  className={getSubmenuClasses("/admin/users")}
                >
                  <div className="flex items-center gap-3">
                    <FontAwesomeIcon icon={getNavIcon("/admin/users", faUser, faUserRegular)} size={20} className="flex-shrink-0" />
                    <span>Users</span>
                  </div>
                  <FontAwesomeIcon icon={openSubmenu === 'users' ? faChevronDown : faChevronRight} size={16} className="flex-shrink-0" />
                </button>
                {openSubmenu === 'users' && (
                  <ul className="mt-1 ml-9 space-y-1">
                    <NavLink
                      to="/admin"
                      className={getSubmenuNavLinkClasses("/admin")}
                      onClick={onClose}
                    >
                      All Users
                    </NavLink>
                  </ul>
                )}
              </li>
              <li>
                <NavLink
                  to="/admin/products"
                  className={getNavLinkClasses("/admin/products")}
                  onClick={onClose}
                >
                  <FontAwesomeIcon icon={getNavIcon("/admin/products", faClipboard, faClipboardRegular)} size={20} className="flex-shrink-0" />
                  <span>Products</span>
                </NavLink>
              </li>
            </ul>
          </nav>

          <div className="p-4 border-t border-gray-600">
            <button
              onClick={() => handleLogout()}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:text-white hover:bg-red-600 transition-colors"
            >
              <div className="flex items-center gap-3">
                <FontAwesomeIcon icon={faRightFromBracket} size={20} className="flex-shrink-0" />
                <span>Logout</span>
              </div>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

export default AdminSidebar;