import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase-config.js";
import { updateProfile, updateEmail } from "firebase/auth";
import { collection, doc, getCountFromServer, setDoc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";

export default function Profile() {
  const user = auth.currentUser;
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ moods: 0, journals: 0 });
  const [status, setStatus] = useState({ type: '', message: '' });
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState("");
  const [age, setAge] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Role-specific fields
  const [userType, setUserType] = useState('patient');
  const [degree, setDegree] = useState('');
  const [hospital, setHospital] = useState('');
  const [city, setCity] = useState('');
  const [experience, setExperience] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const userDocSnap = await getDoc(doc(db, "users", user.uid));
        if (userDocSnap.exists()) {
          const data = userDocSnap.data();
          setUserType(data.userType || 'patient');
          if (data.email) setEmail(data.email);
          if (data.phone) setPhone(data.phone);
          if (data.degree) setDegree(data.degree);
          if (data.hospital) setHospital(data.hospital);
          if (data.city || data.location) setCity(data.city || data.location);
          if (data.experience !== undefined) setExperience(String(data.experience));
          if (data.bio) setBio(data.bio);
          if (data.age !== undefined) setAge(String(data.age));
        }
        // Stats only for patients
        if ((userDocSnap.data()?.userType || 'patient') !== 'therapist') {
          const moodsRef = collection(db, "users", user.uid, "moods");
          const journalRef = collection(db, "users", user.uid, "journal");
          const [moodsSnap, journalSnap] = await Promise.all([
            getCountFromServer(moodsRef),
            getCountFromServer(journalRef)
          ]);
          setStats({ moods: moodsSnap.data().count || 0, journals: journalSnap.data().count || 0 });
        }
      } catch (_) {}
    };
    load();
  }, [user]);


  const save = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatus({ type: '', message: '' });
    
    try {
      console.log('[Profile] Save started');
      // Update display name in Firebase Auth
      try {
        await updateProfile(user, { displayName: displayName || user.displayName });
      } catch (e) {
        console.warn('[Profile] updateProfile failed (continuing)', e);
      }
      
      // Update email in Firebase Auth if changed. If it fails due to recent-login, continue saving other fields.
      let finalEmail = email || user.email;
      if (email && email !== user.email) {
        try {
          await updateEmail(user, email);
          finalEmail = email;
        } catch (emailError) {
          console.warn('[Profile] updateEmail failed', emailError);
          if (emailError.code === 'auth/requires-recent-login') {
            setStatus({ type: 'error', message: 'Email not updated: please log out and back in to change your email. Other profile changes will still be saved.' });
            finalEmail = user.email; // keep old email in Firestore for consistency
          } else {
            throw emailError;
          }
        }
      }
      
      // Prepare base user data
      const baseData = {
        fullName: displayName || user.displayName,
        email: finalEmail,
        phone: phone || '',
        age: isNaN(parseInt(age)) ? null : parseInt(age),
        city: city || null,
        bio: userType === 'therapist' ? (bio || null) : (bio || null),
        updatedAt: new Date().toISOString(),
      };

      // If therapist, include professional fields
      const proData = userType === 'therapist' ? {
        degree: degree || null,
        hospital: hospital || null,
        city: city || null,
        location: city || null, // for legacy components using location
        experience: isNaN(parseInt(experience)) ? 0 : parseInt(experience),
        bio: bio || null,
      } : {};

      // Update user data in Firestore
      console.log('[Profile] Writing user doc');
      await setDoc(doc(db, "users", user.uid), { 
        userType: userType,
        ...baseData,
        ...proData,
      }, { merge: true });
      
      setStatus({ type: 'success', message: 'Profile updated successfully!' });
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setStatus({ type: 'error', message: err.message || 'Failed to update profile. Please try again.' });
    } finally {
      console.log('[Profile] Save finished');
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
        <div className="text-blue-700 font-semibold">Please log in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <h1 className="text-2xl font-bold text-blue-700">Profile</h1>
        <p className="text-gray-600 mt-1">Manage your information and see your stats.</p>

        <form onSubmit={save} className="mt-6 space-y-4">

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!isEditing}
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder="+1 (123) 456-7890"
              />
            </div>

            {/* Patient fields */}
            {userType !== 'therapist' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Age</label>
                  <input
                    type="number"
                    min="0"
                    value={age}
                    onChange={(e) => setAge(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="e.g., 25"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="e.g., New York"
                  />
                </div>
              </div>
            )}

            {/* Therapist-only fields */}
            {userType === 'therapist' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
                  <input
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="e.g., M.D., Psy.D., M.A. Clinical Psych"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hospital/Clinic</label>
                  <input
                    value={hospital}
                    onChange={(e) => setHospital(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="e.g., City General Hospital"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                  <input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="e.g., New York"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience (years)</label>
                  <input
                    type="number"
                    min="0"
                    value={experience}
                    onChange={(e) => setExperience(e.target.value)}
                    disabled={!isEditing}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                    placeholder="e.g., 5"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={!isEditing}
                rows={4}
                className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
                placeholder={userType === 'therapist' ? "Short bio about your practice, specialties, languages, etc." : "Tell a bit about yourself, goals, preferences, and any context you'd like your therapist to know."}
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4">
            {!isEditing ? (
              <motion.button
                type="button"
                onClick={() => setIsEditing(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Edit Profile
              </motion.button>
            ) : (
              <div className="space-x-3">
                <motion.button
                  type="submit"
                  disabled={saving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-blue-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    // Reset form to original values
                    setDisplayName(user.displayName || '');
                    setEmail(user.email || '');
                    setPhone(phone); // Keep the loaded phone number
                    setStatus({ type: '', message: '' });
                  }}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </motion.button>
              </div>
            )}
          </div>

          {status.message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${
              status.type === 'error' 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {status.message}
            </div>
          )}
        </form>

        {userType !== 'therapist' && (
          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="border border-blue-100 rounded-lg p-4 text-center">
              <div className="text-gray-500">Mood Entries</div>
              <div className="text-2xl font-semibold text-blue-700">{stats.moods}</div>
            </div>
            <div className="border border-blue-100 rounded-lg p-4 text-center">
              <div className="text-gray-500">Journal Entries</div>
              <div className="text-2xl font-semibold text-blue-700">{stats.journals}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
