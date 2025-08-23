import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../../firebase-config.js';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function TherapistAnalytics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, 'callRequests'), where('therapistId', '==', uid));
    const unsub = onSnapshot(q, snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const stats = useMemo(() => {
    const s = { total: rows.length, requested: 0, accepted: 0, completed: 0, uniquePatients: 0 };
    const patientSet = new Set();
    for (const r of rows) {
      const st = (r.status || 'requested');
      if (st === 'requested') s.requested++;
      else if (st === 'accepted') s.accepted++;
      else if (st === 'completed') s.completed++;
      if (r.uid) patientSet.add(r.uid);
    }
    s.uniquePatients = patientSet.size;
    return s;
  }, [rows]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">Analytics</h1>
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => (<div key={i} className="h-24 bg-gray-100 rounded animate-pulse"/>))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card label="Total Bookings" value={stats.total} color="bg-blue-50 text-blue-700" />
            <Card label="Requested" value={stats.requested} color="bg-yellow-50 text-yellow-700" />
            <Card label="Accepted" value={stats.accepted} color="bg-green-50 text-green-700" />
            <Card label="Completed" value={stats.completed} color="bg-purple-50 text-purple-700" />
          </div>
        )}

        <div className="mt-6 bg-white rounded-xl border border-gray-100 p-6">
          <div className="text-sm text-gray-600">Unique patients: <span className="font-semibold">{stats.uniquePatients}</span></div>
          <div className="text-xs text-gray-500 mt-2">Data updates in real time from Firestore.</div>
        </div>
      </div>
    </div>
  );
}

function Card({ label, value, color }) {
  return (
    <div className={`rounded-xl border border-gray-100 p-4 ${color}`}>
      <div className="text-sm">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}
