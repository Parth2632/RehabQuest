import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../../firebase-config.js';
import { isTherapistOnline } from '../../hooks/useTherapistStatus.js';
import { User, MapPin, Award, Phone, Mail, Clock } from 'lucide-react';

const TherapistList = ({ onSelectTherapist, selectedTherapistId, showBookingButton = false, activeTherapistId = null }) => {
  const [therapists, setTherapists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Real-time listener for therapists
    const q = query(
      collection(db, 'users'),
      where('userType', '==', 'therapist'),
      where('verificationStatus', '==', 'approved') // Only show approved therapists
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const therapistData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        if (import.meta.env.DEV) {
          console.debug('[TherapistList] loaded', therapistData);
        }

        // Sort therapists: online first, then by experience/rating
        const sortedTherapists = therapistData.sort((a, b) => {
          const aOnline = isTherapistOnline(a);
          const bOnline = isTherapistOnline(b);
          
          // Online therapists first
          if (aOnline && !bOnline) return -1;
          if (!aOnline && bOnline) return 1;
          
          // If both online or both offline, sort by experience
          return (b.experience || 0) - (a.experience || 0);
        });

        setTherapists(sortedTherapists);
        setLoading(false);
        setError(null);
      },
      (error) => {
        console.error('Error fetching therapists:', error);
        setError('Failed to load therapists');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const getInitials = (name) => {
    return name
      ?.split(' ')
      ?.map(n => n[0])
      ?.join('')
      ?.toUpperCase()
      ?.slice(0, 2) || 'TH';
  };

  const formatName = (t) => {
    const base = (t?.name || t?.fullName || t?.displayName || t?.email || 'Therapist').trim();
    return /^(Dr\.?\s)/i.test(base) ? base : `Dr. ${base}`;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-gray-200 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-2 text-red-700 hover:text-red-800 font-medium"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (therapists.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
        <User className="mx-auto mb-4 text-gray-400" size={48} />
        <p className="text-gray-600 mb-2">No therapists available at the moment</p>
        <p className="text-sm text-gray-500">Please check back later</p>
      </div>
    );
  }

  const getName = (t) => t?.name || t?.fullName || t?.displayName || t?.email || 'Therapist';
  const getDegree = (t) => t?.degree || (t?.licenseNumber ? `License: ${t.licenseNumber}` : 'Licensed Therapist');
  const getLocation = (t) => t?.location || t?.city || 'Online';
  const getSpecialties = (t) => Array.isArray(t?.specialties)
    ? t.specialties
    : (typeof t?.specialties === 'string' ? t.specialties.split(',').map(s=>s.trim()).filter(Boolean) : []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">Available Therapists</h2>
        <div className="text-sm text-gray-500">
          {therapists.filter(t => isTherapistOnline(t)).length} online • {therapists.length} total
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
        {therapists.map(therapist => {
          const online = isTherapistOnline(therapist);
          const isSelected = selectedTherapistId === therapist.id;
          const name = formatName(therapist);
          const degree = getDegree(therapist);
          const loc = getLocation(therapist);
          const exp = Number(therapist?.experience || 0);
          const specs = getSpecialties(therapist);
          
          return (
            <motion.div
              key={therapist.id}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelectTherapist && onSelectTherapist(therapist)}
              className={`bg-white rounded-xl p-6 shadow-sm border-2 transition-all cursor-pointer ${
                isSelected 
                  ? 'border-blue-300 bg-blue-50' 
                  : 'border-gray-100 hover:border-blue-200 hover:shadow-md'
              }`}
            >
              {/* Header with Avatar and Status */}
              <div className="flex items-start space-x-4 mb-4">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {getInitials(name)}
                  </div>
                  {/* Online Indicator */}
                  <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${
                    online ? 'bg-green-500' : 'bg-gray-400'
                  }`}></div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 text-lg truncate">
                      {name}
                    </h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                      online 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {online ? 'Online' : 'Offline'}
                    </div>
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <Award className="w-4 h-4 mr-1" />
                    <span className="truncate">{degree}</span>
                  </div>
                  
                  {therapist.hospital && (
                    <div className="text-sm text-gray-600 mt-1 truncate">🏥 {therapist.hospital}</div>
                  )}
                  
                  <div className="flex items-center text-sm text-gray-600 mt-1">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span className="truncate">{loc}</span>
                  </div>
                </div>
              </div>

              {/* Specialties */}
              <div className="mb-4">
                <div className="flex flex-wrap gap-2">
                  {specs.slice(0, 3).map((specialty, index) => (
                    <span 
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full"
                    >
                      {specialty}
                    </span>
                  ))}
                  {specs.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      +{specs.length - 3} more
                    </span>
                  )}
                </div>
              </div>

              {/* Bio Preview */}
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {therapist.bio || 'No bio provided yet.'}
              </p>

              {/* Experience and Contact Info */}
              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  <span>{exp} years exp.</span>
                </div>
                {(therapist.phone1 || therapist.phone) && (
                  <div className="flex items-center">
                    <Phone className="w-4 h-4 mr-1" />
                    <span>{therapist.phone1 || therapist.phone}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {showBookingButton && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    const blocked = !!activeTherapistId && activeTherapistId !== therapist.id;
                    if (!blocked && online && onSelectTherapist) onSelectTherapist(therapist);
                  }}
                  className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
                    (!!activeTherapistId && activeTherapistId !== therapist.id)
                      ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      : online
                        ? 'bg-blue-500 text-white hover:bg-blue-600'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  }`}
                  disabled={(!!activeTherapistId && activeTherapistId !== therapist.id) || !online}
                >
                  {(() => {
                    if (!!activeTherapistId && activeTherapistId !== therapist.id) return 'Finish/Cancel current first';
                    return online ? 'Book Session' : 'Currently Offline';
                  })()}
                </motion.button>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default TherapistList;
