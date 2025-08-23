import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Stethoscope, Mail, Lock, Eye, EyeOff, ArrowLeft, MapPin, Award } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../../firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, onAuthStateChanged, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

export default function TherapistAuth() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetNotice, setResetNotice] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    licenseNumber: '',
    specialties: '',
    location: '',
    experience: '',
    phone1: '',
    phone2: '',
    degree: '',
    college: '',
    hospital: '',
    bio: ''
  });
  const navigate = useNavigate();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login existing therapist
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        console.log('Therapist logged in:', userCredential.user);
        navigate('/therapist/dashboard'); // Redirect to therapist dashboard
      } else {
        // Register new therapist
        if (formData.password !== formData.confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          setError('Password must be at least 6 characters long');
          setLoading(false);
          return;
        }

        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Update user profile
        await updateProfile(user, {
          displayName: formData.fullName
        });

        // Store therapist data in users collection
        await setDoc(doc(db, 'users', user.uid), {
          name: formData.fullName,
          fullName: formData.fullName,
          email: formData.email,
          userType: 'therapist',
          licenseNumber: formData.licenseNumber,
          specialties: formData.specialties.split(',').map(s => s.trim()),
          location: formData.location,
          experience: parseInt(formData.experience),
          phone1: formData.phone1,
          phone2: formData.phone2,
          degree: formData.degree,
          college: formData.college,
          hospital: formData.hospital,
          bio: formData.bio,
          availability: 'Available for consultations',
          verified: false,
          verificationStatus: 'pending',
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp()
        });

        console.log('Therapist registered:', user);
        navigate('/therapist/profile'); // Redirect to profile to confirm
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-purple-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {/* Back Button */}
        <motion.button
          onClick={() => navigate('/')}
          className="flex items-center text-purple-600 hover:text-purple-700 mb-6 transition-colors"
          whileHover={{ x: -5 }}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Home
        </motion.button>

        {/* Auth Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <div className="bg-purple-100 rounded-full p-4 w-16 h-16 mx-auto mb-4">
              <Stethoscope className="w-8 h-8 text-purple-600 mx-auto" />
            </div>
            <h2 className="text-2xl font-bold text-purple-700 mb-2">
              {isLogin ? 'Welcome Back, Doctor' : 'Join as Therapist'}
            </h2>
            <p className="text-gray-600">
              {isLogin ? 'Access your professional dashboard' : 'Help patients on their mental health journey'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Dr. Your Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">License #</label>
                    <input
                      type="text"
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleInputChange}
                      required
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="License number"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Experience (years)</label>
                    <input
                      type="number"
                      name="experience"
                      value={formData.experience}
                      onChange={handleInputChange}
                      required
                      min="0"
                      max="50"
                      className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="Years"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Specialties</label>
                  <input
                    type="text"
                    name="specialties"
                    value={formData.specialties}
                    onChange={handleInputChange}
                    required
                    className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="e.g., Anxiety, Depression, PTSD (comma-separated)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      required
                      className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="City, State"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Primary Phone</label>
                    <input type="tel" name="phone1" value={formData.phone1} onChange={handleInputChange} pattern="^[0-9+\-()\s]{7,15}$" title="Enter a valid phone number" className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="+1 234 567 8901" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Backup Phone</label>
                    <input type="tel" name="phone2" value={formData.phone2} onChange={handleInputChange} pattern="^[0-9+\-()\s]{7,15}$" title="Enter a valid phone number" className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Optional" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Degree</label>
                    <input type="text" name="degree" value={formData.degree} onChange={handleInputChange} className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g., MD Psychiatry" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">College</label>
                    <input type="text" name="college" value={formData.college} onChange={handleInputChange} className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Institution name" required />
                  </div>
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hospital / Clinic</label>
                  <input type="text" name="hospital" value={formData.hospital} onChange={handleInputChange} className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Affiliated hospital/clinic" />
                </div>

                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Professional Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    required
                    rows="3"
                    className="w-full px-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                    placeholder="Brief description of your practice and approach..."
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Professional Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="doctor@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full pl-10 pr-12 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  placeholder="Secure password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {isLogin && (
                <div className="mt-2">
                  <button type="button" onClick={async () => {
                    try {
                      setResetNotice('');
                      if (!formData.email) { setError('Enter your email above to reset your password.'); return; }
                      await sendPasswordResetEmail(auth, formData.email);
                      setResetNotice('Password reset email sent. Check your inbox.');
                    } catch (e) {
                      setError(e.message);
                    }
                  }} className="text-sm text-purple-600 hover:text-purple-700">Forgot password?</button>
                </div>
              )}
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    required
                    className="w-full pl-10 pr-4 py-3 border border-purple-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    placeholder="Confirm password"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}
            {resetNotice && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {resetNotice}
              </div>
            )}

            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Professional Account')}
            </motion.button>
          </form>

          {/* Toggle Login/Register */}
          <div className="text-center mt-6">
            <p className="text-gray-600">
              {isLogin ? "Don't have an account?" : "Already have an account?"}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError('');
                  setFormData({
                    fullName: '',
                    email: '',
                    password: '',
                    confirmPassword: '',
                    licenseNumber: '',
                    specialties: '',
                    location: '',
                    experience: '',
                    bio: ''
                  });
                }}
                className="ml-2 text-purple-600 hover:text-purple-700 font-semibold"
              >
                {isLogin ? 'Sign Up' : 'Sign In'}
              </button>
            </p>
          </div>

          {!isLogin && (
            <div className="mt-6 p-4 bg-purple-50 rounded-lg border border-purple-100">
              <div className="flex items-center text-purple-700 text-sm">
                <Award className="w-4 h-4 mr-2" />
                <span>Professional accounts require verification before activation</span>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
