import React, { useEffect, useState } from 'react';
import { FiActivity, FiClock, FiCheckCircle } from 'react-icons/fi';
import { auth, db } from '../../firebase-config.js';
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore';

export default function TherapistActivities() {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    // Use callRequests as activity source; order by updatedAt/createdAt desc
    const q = query(collection(db, 'callRequests'), where('therapistId', '==', uid));
    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      rows.sort((a,b) => ((b.updatedAt?.toDate?.()?.getTime?.()||b.createdAt?.toDate?.()?.getTime?.()||0) - (a.updatedAt?.toDate?.()?.getTime?.()||a.createdAt?.toDate?.()?.getTime?.()||0)));
      setEvents(rows.slice(0, 30));
    });
    return () => unsub();
  }, []);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Activities</h1>
        <p className="text-gray-600">Recent booking activity</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y">
        {events.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No recent activity</div>
        ) : events.map(ev => (
          <div key={ev.id} className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center"><FiActivity /></div>
            <div className="flex-1">
              <div className="font-medium text-gray-800">Booking {ev.status || 'requested'}{ev.topic ? ` • ${ev.topic}` : ''}</div>
              <div className="text-xs text-gray-500 flex items-center gap-1"><FiClock /> {(ev.updatedAt?.toDate?.()?.toLocaleString?.() || ev.createdAt?.toDate?.()?.toLocaleString?.() || '')}</div>
            </div>
            <div className="text-green-600 flex items-center gap-1 text-sm"><FiCheckCircle /> tracked</div>
          </div>
        ))}
      </div>
    </div>
  );
}
