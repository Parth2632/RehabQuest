import React, { useEffect } from "react";
import { auth } from "../firebase-config.js";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

function Logout() {
  const navigate = useNavigate();

  useEffect(() => {
    signOut(auth).then(() => {
      navigate("/login"); // after logout, go back to login page
    });
  }, [navigate]);

  return <p>Logging out...</p>;
}

export default Logout;
