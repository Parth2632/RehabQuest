import React, { useEffect } from "react";
import { auth } from "../firebase-config.js";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function TherapistLogout() {
  const navigate = useNavigate();
  useEffect(() => { signOut(auth).then(() => navigate('/therapist/login')); }, [navigate]);
  return <p className="p-6">Logging out…</p>;
}
