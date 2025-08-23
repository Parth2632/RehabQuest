import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../../firebase-config.js";
import { 
  Stethoscope,
  Settings, 
  User, 
  Menu, 
  X, 
  Home,
  Users,
  BarChart3,
  Calendar,
  MessageSquare,
  FileText,
  Activity,
  UserCheck
} from "lucide-react";

function TherapistNavbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthClick = () => {
    if (isLoggedIn) {
      navigate("/therapist/logout");
    } else {
      navigate("/therapist/auth");
    }
  };

  // Trim down to essential navlinks
  const navigationItems = [
    { to: "/therapist/dashboard", label: "Dashboard", icon: Home },
    { to: "/therapist/appointments", label: "Appointments", icon: Calendar },
    { to: "/therapist/messages", label: "Messages", icon: MessageSquare },
  ];

  const navLinkClasses = "hover:text-green-600 transition-colors duration-200 flex items-center gap-2";
  const activeLinkClasses = "text-green-700 font-semibold border-b-2 border-green-500";
  const mobileNavLinkClasses = "flex items-center gap-3 p-3 rounded-lg hover:bg-green-100 transition-colors duration-200";
  const mobileActiveLinkClasses = "bg-green-100 text-green-700 font-semibold";

  return (
    <nav className="bg-green-50 border-b border-green-100 shadow-sm px-4 lg:px-6 py-4 relative">
      <div className="flex justify-between items-center">
        {/* Logo with Stethoscope Icon */}
        <NavLink to="/therapist/dashboard" className="flex items-center gap-2 text-2xl font-bold text-green-700">
          <motion.div
            animate={{ rotate: [0, 5, -5, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <Stethoscope className="text-green-600" size={28} />
          </motion.div>
          <span className="hidden sm:inline">RehabQuest</span>
          <span className="sm:hidden">RQ</span>
        </NavLink>

        {/* Desktop Navigation Links */}
        <ul className="hidden lg:flex space-x-6 text-gray-700 font-medium items-center">
          {navigationItems.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                className={({ isActive }) =>
                  `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
                }
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        {/* Right-side icons + Mobile Menu Button */}
        <div className="flex items-center space-x-2 lg:space-x-4">
          {/* Desktop Icons */}
          <div className="hidden lg:flex items-center space-x-4">
            <button
              title="Settings"
              onClick={() => navigate("/therapist/settings")}
              className="p-2 rounded-lg hover:bg-green-100 transition"
            >
              <Settings size={20} className="text-green-600" />
            </button>
            <button
              title="Profile"
              onClick={() => navigate("/therapist/profile")}
              className="p-2 rounded-lg hover:bg-green-100 transition"
            >
              <User size={20} className="text-green-600" />
            </button>
            <button
              onClick={handleAuthClick}
              className="bg-gradient-to-r from-green-500 to-green-600 text-white px-5 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-green-600 hover:to-green-700 transition"
            >
              {isLoggedIn ? "Logout" : "Login"}
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-green-100 transition"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? (
              <X size={24} className="text-green-600" />
            ) : (
              <Menu size={24} className="text-green-600" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-green-100 shadow-lg z-50"
          >
            <div className="p-4 space-y-2">
              {navigationItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    `${mobileNavLinkClasses} ${isActive ? mobileActiveLinkClasses : ""}`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </NavLink>
              ))}
              
              {/* Mobile Menu Divider */}
              <div className="border-t border-green-100 pt-4 mt-4">
                <div className="flex flex-col space-y-2">
                  <button
                    onClick={() => {
                      navigate("/therapist/settings");
                      setIsMobileMenuOpen(false);
                    }}
                    className={mobileNavLinkClasses}
                  >
                    <Settings size={20} />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      navigate("/therapist/profile");
                      setIsMobileMenuOpen(false);
                    }}
                    className={mobileNavLinkClasses}
                  >
                    <User size={20} />
                    <span>Profile</span>
                  </button>
                  <button
                    onClick={() => {
                      handleAuthClick();
                      setIsMobileMenuOpen(false);
                    }}
                    className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-3 rounded-lg shadow-sm hover:shadow-md hover:from-green-600 hover:to-green-700 transition mx-3 mt-2"
                  >
                    {isLoggedIn ? "Logout" : "Login"}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Menu Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}
      </AnimatePresence>
    </nav>
  );
}

export default TherapistNavbar;
