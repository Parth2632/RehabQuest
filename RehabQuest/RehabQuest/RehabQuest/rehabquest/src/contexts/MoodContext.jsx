import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, orderBy, query, addDoc, serverTimestamp } from 'firebase/firestore';
import { listMoods as offlineListMoods, addMood as offlineAddMood } from '../utils/offline-store.js';

const MoodContext = createContext();

export function useMood() {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMood must be used within a MoodProvider');
  }
  return context;
}

export function MoodProvider({ children }) {
  const [entries, setEntries] = useState([]);
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
      setEntries(offlineListMoods(null));
      setLoading(false);
      return;
    }

    try {
      const q = query(collection(db, "users", user.uid, "moods"), orderBy("createdAt", "asc"));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEntries(list);
        setLoading(false);
      });
      return () => unsub();
    } catch (_) {
      setEntries(offlineListMoods(user?.uid));
      setLoading(false);
    }
  }, [user]);

  const saveMood = async (score) => {
    try {
      if (!user) throw new Error('no-user');
      await addDoc(collection(db, "users", user.uid, "moods"), {
        score: Number(score),
        createdAt: serverTimestamp(),
      });
    } catch (_) {
      const next = offlineAddMood(user?.uid, score);
      setEntries(next);
    }
  };

  const getChartData = (days = 7) => {
    if (entries.length === 0) {
      // Generate sample data for the last N days when no entries exist
      const sampleData = [];
      for (let i = days - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        sampleData.push({
          time: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          mood: null, // show a gap when there's no data
          isEmpty: true
        });
      }
      return sampleData;
    }

    // Process actual entries
    const byDay = new Map();
    const sorted = [...entries].sort((a,b) => {
      const ta = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : (a.createdAt || Date.now());
      const tb = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : (b.createdAt || Date.now());
      return ta - tb;
    });
    
    for (const e of sorted) {
      const d = e.createdAt?.toDate ? e.createdAt.toDate() : new Date(e.createdAt || Date.now());
      const ts = d.getTime();
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const moodVal = Number(e.score);
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

  const value = {
    entries,
    loading,
    saveMood,
    getChartData,
    user
  };

  return (
    <MoodContext.Provider value={value}>
      {children}
    </MoodContext.Provider>
  );
}
