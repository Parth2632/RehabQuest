import React from "react";
import { useLocation } from "react-router-dom";
import PatientNavbar from "../patients/PatientNavbar.jsx";
import TherapistNavbar from "../therapist/TherapistNavbar.jsx";

function Layout({ children, userType = null }) {
  const location = useLocation();
  const pathname = location.pathname;

  // Determine if we should show a navbar and which one
  const shouldShowNavbar = () => {
    // Don't show navbar on auth pages, landing page, or user selection
    const authPaths = [
      "/patient/auth",
      "/therapist/auth",
      "/login",
      "/therapist/login",
      "/logout",
      "/therapist/logout"
    ];

    return !authPaths.includes(pathname);
  };

  const getNavbarType = () => {
    if (!shouldShowNavbar()) return null;
    
    // Check if path starts with /therapist
    if (pathname.startsWith("/therapist")) {
      return "therapist";
    }
    
    // Check if path starts with /patient or is a patient-specific route
    if (pathname.startsWith("/patient") || 
        pathname.startsWith("/mood-tracker") ||
        pathname.startsWith("/cbt-games") ||
        pathname.startsWith("/journaling") ||
        pathname.startsWith("/community") ||
        pathname.startsWith("/book-call") ||
        pathname.startsWith("/ai") ||
        pathname.startsWith("/chat") ||
        pathname.startsWith("/pt-chat") ||
        pathname.startsWith("/thought-record")) {
      return "patient";
    }

    // Use userType prop as fallback for ambiguous routes
    if (userType === "therapist") {
      return "therapist";
    } else if (userType === "patient") {
      return "patient";
    }

    // Default fallback
    return "patient"; // Default to patient navbar
  };

  const renderNavbar = () => {
    const navbarType = getNavbarType();
    
    switch (navbarType) {
      case "patient":
        return <PatientNavbar />;
      case "therapist":
        return <TherapistNavbar />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {renderNavbar()}
      <main className={shouldShowNavbar() ? "" : "min-h-screen"}>
        {children}
      </main>
    </div>
  );
}

export default Layout;
