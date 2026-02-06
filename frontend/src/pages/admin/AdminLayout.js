import React, { useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBurger } from "@fortawesome/free-solid-svg-icons";
import AdminSidebar from "../../components/AdminSidebar"

function AdminLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  const location = useLocation();
  const activePath = location.pathname;

  const [pageTitle, setPageTitle] = useState("Admin");
  const [headerAction, setHeaderAction] = useState(null);

  return (
    <div className="flex h-screen">
      <AdminSidebar
      isOpen={isSidebarOpen}
        onClose={closeSidebar}
        activePath={activePath}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-blue-700 shadow-sm z-10">
          <div className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleSidebar}
                className="lg:hidden p-2 rounded-md hover:bg-blue-600 transition-colors"
              >
                <FontAwesomeIcon icon={faBurger} />
              </button> 

              <h2 className="text-xl font-semibold capitalize">
                {pageTitle}
              </h2>
            </div>
            {headerAction}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          <Outlet context={{ setPageTitle, setHeaderAction }} />
        </main>
      </div>
    </div>
  );
}

export default AdminLayout;
