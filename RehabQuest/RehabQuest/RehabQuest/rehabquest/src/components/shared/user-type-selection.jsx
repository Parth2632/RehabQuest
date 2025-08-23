import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { User, Stethoscope, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function UserTypeSelection() {
  const [selectedType, setSelectedType] = useState(null);
  const navigate = useNavigate();

  const handleSelection = (userType) => {
    setSelectedType(userType);
    // Navigate to appropriate login/signup page
    if (userType === 'patient') {
      navigate('/patient/auth');
    } else {
      navigate('/therapist/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-bold text-blue-700 mb-4"
          >
            Welcome to RehabQuest
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 mb-8"
          >
            Your journey to mental wellness starts here
          </motion.p>
          <motion.p 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-gray-500"
          >
            Please select your role to continue:
          </motion.p>
        </div>

        {/* User Type Selection Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          {/* Patient Card */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelection('patient')}
            className="bg-white rounded-2xl shadow-lg border border-blue-100 p-8 cursor-pointer hover:shadow-xl transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="bg-blue-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 group-hover:bg-blue-200 transition-colors">
                <User className="w-12 h-12 text-blue-600 mx-auto" />
              </div>
              
              <h3 className="text-2xl font-bold text-blue-700 mb-4">I'm a Patient</h3>
              
              <ul className="text-gray-600 space-y-2 mb-6 text-left">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Track your mood and recovery journey
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Access CBT games and wellness tools
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Connect with qualified therapists
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mr-3"></div>
                  Join supportive community discussions
                </li>
              </ul>

              <motion.div 
                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-2 group-hover:from-blue-600 group-hover:to-blue-700 transition-all"
                whileHover={{ x: 5 }}
              >
                <span className="font-semibold">Continue as Patient</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </div>
          </motion.div>

          {/* Doctor/Therapist Card */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelection('therapist')}
            className="bg-white rounded-2xl shadow-lg border border-purple-100 p-8 cursor-pointer hover:shadow-xl transition-all duration-300 group"
          >
            <div className="text-center">
              <div className="bg-purple-100 rounded-full p-6 w-24 h-24 mx-auto mb-6 group-hover:bg-purple-200 transition-colors">
                <Stethoscope className="w-12 h-12 text-purple-600 mx-auto" />
              </div>
              
              <h3 className="text-2xl font-bold text-purple-700 mb-4">I'm a Therapist</h3>
              
              <ul className="text-gray-600 space-y-2 mb-6 text-left">
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Manage your client appointments
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  View patient progress and analytics
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Access professional dashboard tools
                </li>
                <li className="flex items-center">
                  <div className="w-2 h-2 bg-purple-400 rounded-full mr-3"></div>
                  Connect with patients securely
                </li>
              </ul>

              <motion.div 
                className="bg-gradient-to-r from-purple-500 to-purple-600 text-white py-3 px-6 rounded-xl flex items-center justify-center gap-2 group-hover:from-purple-600 group-hover:to-purple-700 transition-all"
                whileHover={{ x: 5 }}
              >
                <span className="font-semibold">Continue as Therapist</span>
                <ArrowRight className="w-4 h-4" />
              </motion.div>
            </div>
          </motion.div>
        </div>

        {/* Footer */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-12 text-gray-500"
        >
          <p className="text-sm">
            Secure • Private • Professional Healthcare Platform
          </p>
        </motion.div>
      </div>
    </div>
  );
}
