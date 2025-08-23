import React, { useState } from "react";
import { motion } from "framer-motion";
import { auth, db } from "../firebase-config.js";
import { RecaptchaVerifier, signInWithPhoneNumber, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";

const degreeOptions = ["MBBS", "MD Psychiatry", "PhD Psychology", "MPhil Clinical Psychology", "MSW", "Other"];

export default function TherapistLogin() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [usePhone, setUsePhone] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [degree, setDegree] = useState(degreeOptions[0]);
  const [education, setEducation] = useState("");
  const [hospital, setHospital] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmation, setConfirmation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const initRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container-therapist', { size: 'invisible' });
    }
    return window.recaptchaVerifier;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      if (usePhone) {
        if (!confirmation) {
          const verifier = initRecaptcha();
          const conf = await signInWithPhoneNumber(auth, phone, verifier);
          setConfirmation(conf);
        } else {
          const cred = await confirmation.confirm(otp);
          await setDoc(doc(db, 'users', cred.user.uid), {
            userType: 'therapist',
            role: 'therapist',
            fullName: fullName || cred.user.email || '',
            degree,
            education,
            hospital,
            phone,
            email: cred.user.email,
            createdAt: new Date().toISOString(),
          }, { merge: true });
        }
      } else if (isSignUp) {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await setDoc(doc(db, 'users', res.user.uid), {
          userType: 'therapist',
          role: 'therapist',
          fullName: fullName || email,
          degree,
          education,
          hospital,
          phone,
          email: email,
          createdAt: new Date().toISOString(),
        }, { merge: true });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center py-12 px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl w-full bg-white rounded-xl shadow-lg border border-blue-100 p-8">
        <h2 className="text-3xl font-bold text-blue-700 mb-2">Therapist {isSignUp ? 'Registration' : 'Login'}</h2>
        <p className="text-gray-600 mb-4">Verified access for licensed professionals.</p>

        {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center justify-center gap-4">
            <button type="button" onClick={() => setUsePhone(true)} className={`px-3 py-1 rounded ${usePhone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>Phone OTP</button>
            <button type="button" onClick={() => setUsePhone(false)} className={`px-3 py-1 rounded ${!usePhone ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>Email</button>
            <button type="button" onClick={() => setIsSignUp(!isSignUp)} className="px-3 py-1 rounded bg-gray-100 text-gray-600">{isSignUp ? 'Have account? Login' : 'New? Register'}</button>
          </div>

          <input type="text" placeholder="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" required />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={degree} onChange={(e) => setDegree(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg">
              {degreeOptions.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
            <input type="text" placeholder="Education (e.g., Residency, Certifications)" value={education} onChange={(e) => setEducation(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" />
          </div>

          <input type="text" placeholder="Hospital / Clinic" value={hospital} onChange={(e) => setHospital(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" required />

          {usePhone ? (
            <div className="space-y-3">
              <input type="tel" placeholder="Phone (e.g., +11234567890)" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" required />
              {confirmation && (<input type="text" placeholder="OTP" value={otp} onChange={(e) => setOtp(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" required />)}
              <div id="recaptcha-container-therapist" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" required />
              <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-blue-200 rounded-lg" required />
            </div>
          )}

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-gradient-to-r from-blue-400 to-blue-500 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg disabled:opacity-50" disabled={loading}>
            {loading ? 'Processing…' : usePhone ? (confirmation ? 'Verify OTP' : 'Send OTP') : (isSignUp ? 'Register' : 'Login')}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
