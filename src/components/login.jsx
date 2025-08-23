import React, { useState } from "react";
import { motion } from "framer-motion";
import { auth, db, provider } from "../firebase-config.js";
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Chrome } from "lucide-react";

export default function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    fullName: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        // Store additional user info in Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
          fullName: formData.fullName,
          email: formData.email,
          createdAt: new Date().toISOString(),
          moodEntries: [],
          journalEntries: []
        });
      } else {
        await signInWithEmailAndPassword(auth, formData.email, formData.password);
      }
      navigate("/"); // Redirect to home page
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    
    try {
      const result = await signInWithPopup(auth, provider);
      // Store user info in Firestore if new user
      await setDoc(doc(db, "users", result.user.uid), {
        fullName: result.user.displayName,
        email: result.user.email,
        createdAt: new Date().toISOString(),
        moodEntries: [],
        journalEntries: []
      }, { merge: true });
      navigate("/");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-12 px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white rounded-xl shadow-lg border border-blue-100 p-8"
      >
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-blue-700 mb-2">
            {isSignUp ? "Join RehabQuest" : "Welcome Back"}
          </h2>
          <p className="text-gray-600">
            {isSignUp ? "Start your recovery journey" : "Continue your healing path"}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <div className="relative">
              <User className="absolute left-3 top-3 text-blue-500" size={20} />
              <input
                type="text"
                name="fullName"
                placeholder="Full Name"
                value={formData.fullName}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required={isSignUp}
              />
            </div>
          )}

          <div className="relative">
            <Mail className="absolute left-3 top-3 text-blue-500" size={20} />
            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={formData.email}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 text-blue-500" size={20} />
            <input
              type="password"
              name="password"
              placeholder="Password"
              value={formData.password}
              onChange={handleInputChange}
              className="w-full pl-10 pr-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg transition disabled:opacity-50"
          >
            {loading ? "Processing..." : (isSignUp ? "Create Account" : "Sign In")}
          </motion.button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or continue with</span>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="mt-4 w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-lg shadow-sm hover:shadow-md transition disabled:opacity-50"
          >
            <Chrome className="mr-2 text-blue-500" size={20} />
            <span className="text-gray-700 font-medium">Google</span>
          </motion.button>
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}
            {" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:text-blue-700 font-semibold transition"
            >
              {isSignUp ? "Sign In" : "Sign Up"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
