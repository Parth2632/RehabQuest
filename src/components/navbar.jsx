import React, { useState, useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { auth } from "../firebase-config.js";
import { Settings, User } from "lucide-react";

function Navbar() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setIsLoggedIn(!!user);
    });
    return () => unsubscribe();
  }, []);

  const handleAuthClick = () => {
    if (isLoggedIn) {
      navigate("/logout");
    } else {
      navigate("/login");
    }
  };

  const navLinkClasses =
    "hover:text-blue-600 transition-colors duration-200";

  const activeLinkClasses =
    "text-blue-700 font-semibold border-b-2 border-blue-500";

  return (
    <nav className="bg-blue-50 border-b border-blue-100 shadow-sm px-6 py-4 flex justify-between items-center">
      {/* Logo */}
      <NavLink to="/" className="text-2xl font-bold text-blue-700">
        RehabQuest
      </NavLink>

      {/* Navigation Links */}
      <ul className="flex space-x-6 text-gray-700 font-medium items-center">
        <li>
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
            }
          >
            Dashboard
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/mood-tracker"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
            }
          >
            Mood Tracker
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/cbt-games"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
            }
          >
            CBT Games
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/journaling"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
            }
          >
            Journaling
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/community"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
            }
          >
            Community
          </NavLink>
        </li>
        <li>
          <NavLink
            to="/book-call"
            className={({ isActive }) =>
              `${navLinkClasses} ${isActive ? activeLinkClasses : ""}`
            }
          >
            Book Call
          </NavLink>
        </li>
      </ul>

      {/* Right-side icons + button */}
      <div className="flex items-center space-x-4">
        <button
          title="Settings"
          onClick={() => navigate("/settings")}
          className="p-2 rounded-lg hover:bg-blue-100 transition"
        >
          <Settings size={20} className="text-blue-600" />
        </button>
        <button
          title="Profile"
          onClick={() => navigate("/profile")}
          className="p-2 rounded-lg hover:bg-blue-100 transition"
        >
          <User size={20} className="text-blue-600" />
        </button>
        <button
          onClick={handleAuthClick}
          className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-5 py-2 rounded-lg shadow-sm hover:shadow-md hover:from-blue-500 hover:to-blue-600 transition"
        >
          {isLoggedIn ? "Logout" : "Login"}
        </button>
      </div>
    </nav>
  );
}

export default Navbar;
