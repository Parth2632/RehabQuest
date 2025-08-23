import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, orderBy } from 'firebase/firestore';

const PatientContext = createContext();

export function usePatients() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatients must be used within a PatientProvider');
  }
  return context;
}

export function PatientProvider({ children }) {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setPatients([]);
      setLoading(false);
      return;
    }

    // Check if user is a therapist
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('uid', '==', user.uid), where('userType', '==', 'therapist'));
      
      const unsub = onSnapshot(q, async (snap) => {
        if (snap.empty) {
          setPatients([]);
          setLoading(false);
          return;
        }

        // User is a therapist, get their patients
        const therapistDoc = snap.docs[0];
        const therapistData = therapistDoc.data();
        
        if (therapistData.patients && therapistData.patients.length > 0) {
          // Get patient details and their mood data
          const patientPromises = therapistData.patients.map(async (patientId) => {
            const patientRef = collection(db, 'users', patientId);
            const patientSnap = await patientRef.get();
            
            if (patientSnap.exists) {
              const patientData = patientSnap.data();
              
              // Get patient's mood data
              const moodsRef = collection(db, 'users', patientId, 'moods');
              const moodsQuery = query(moodsRef, orderBy('createdAt', 'desc'));
              
              return new Promise((resolve) => {
                const moodUnsub = onSnapshot(moodsQuery, (moodSnap) => {
                  const moods = moodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
                  resolve({
                    id: patientId,
                    ...patientData,
                    moods: moods
                  });
                });
                
                // Store unsubscribe function for cleanup
                resolve.moodUnsub = moodUnsub;
              });
            }
            return null;
          });

          const patientResults = await Promise.all(patientPromises);
          const validPatients = patientResults.filter(p => p !== null);
          
          setPatients(validPatients);
          setLoading(false);
        } else {
          setPatients([]);
          setLoading(false);
        }
      });

      return () => unsub();
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
      setLoading(false);
    }
  }, [user]);

  const getPatientMoodData = (patientId, days = 7) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.moods) return [];

    const moods = patient.moods;
    if (moods.length === 0) {
      // Generate sample data for the last N days when no entries exist
      const sampleData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        sampleData.push({
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          mood: null,
          isEmpty: true
        });
      }
      return sampleData;
    }

    // Process actual entries
    const byDay = new Map();
    const sorted = [...moods].sort((a,b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || Date.now());
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || Date.now());
      return ta - tb;
    });
    
    for (const m of sorted) {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt || Date.now());
      const ts = d.getTime();
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const moodVal = Number(m.score);
      const existing = byDay.get(key);
      // Keep the most recent entry per day (by timestamp)
      if (!existing || ts > existing.__ts) {
        byDay.set(key, { 
          time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 
          mood: isNaN(moodVal) ? null : moodVal,
          isEmpty: false,
          __ts: ts,
        });
      }
    }
    
    // Build an exact last-N-days timeline and pull the latest mood of each day
    const result = [];
    const today = new Date();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setHours(0,0,0,0);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const entry = byDay.get(key);
      result.push({
        time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        mood: entry ? entry.mood : null,
        isEmpty: !entry
      });
    }
    
    return result;
  };

  const getPatientCurrentMood = (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (!patient || !patient.moods || patient.moods.length === 0) return null;
    
    return patient.moods[0]; // Most recent mood (already ordered by desc)
  };

  const value = {
    patients,
    loading,
    getPatientMoodData,
    getPatientCurrentMood,
    user
  };

  return (
    <PatientContext.Provider value={value}>
      {children}
    </PatientContext.Provider>
  );
}
