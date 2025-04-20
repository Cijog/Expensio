"use client";
import { Link, useLocation } from "react-router-dom";
import { Home, CreditCard, Plane, CheckSquare, Settings, LifeBuoy, Receipt, LogOut } from "lucide-react";

function Sidebar({ isMinimized, toggleSidebar, user, onLogout }) {
  const location = useLocation();

  const navItems = [
    {
      title: "Home",
      href: "/",
      icon: Home,
    },
    {
      title: "Expenses",
      href: "/expenses",
      icon: CreditCard,
    },
    {
      title: "Trips",
      href: "/trips",
      icon: Plane,
    },
    {
      title: "Receipts",
      href: "/receipts",
      icon: Receipt,
    },
    {
      title: "Approvals",
      href: "/approvals",
      icon: CheckSquare,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
    {
      title: "Support",
      href: "/support",
      icon: LifeBuoy,
    },
  ];

  return (
    <nav
      className={`fixed top-0 bottom-0 ${isMinimized ? "w-16" : "w-64"} bg-sidebar-bg p-5 transition-all duration-300 z-40`}
    >
      {/* Profile Section */}
      <div className="mb-10 flex items-center relative">
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mr-3 overflow-hidden">
          {user?.profilePhoto ? (
            <img
              src={`http://localhost:5000/${user.profilePhoto}`} // Ensure this URL matches your backend static file serving
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-500 text-xl">👤</span>
          )}
        </div>
        <span className={`text-white ${isMinimized ? "hidden" : "block"}`}>{user?.username || "User"}</span>
      </div>

      {/* Navigation Items */}
      <ul className="space-y-4">
        {navItems.map((item) => (
          <li key={item.href}>
            <Link
              to={item.href}
              className={`flex items-center text-purple-accent hover:text-purple-hover ${
                location.pathname === item.href ? "font-bold" : ""
              } ${isMinimized ? "justify-center" : ""}`}
            >
              <item.icon className="h-5 w-5 mr-2" />
              <span className={isMinimized ? "hidden" : "block"}>{item.title}</span>
            </Link>
          </li>
        ))}
      </ul>

      {/* Logout Button */}
      <div className="absolute bottom-16 left-0 right-0 flex justify-center">
        <button
          onClick={onLogout}
          className={`flex items-center text-red-500 hover:text-red-400 ${isMinimized ? "justify-center" : ""}`}
        >
          <LogOut className="h-5 w-5 mr-2" />
          <span className={isMinimized ? "hidden" : "block"}>Logout</span>
        </button>
      </div>

      {/* App Branding */}
      <div className="absolute bottom-5 left-0 right-0 text-center">
        <span className="text-green-accent text-xl font-bold">EXPENSIO</span>
      </div>
    </nav>
  );
}

export default Sidebar;