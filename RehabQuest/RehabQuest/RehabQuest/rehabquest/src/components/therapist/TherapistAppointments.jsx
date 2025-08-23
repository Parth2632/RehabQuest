import React, { useEffect, useMemo, useState } from 'react';
import { FiCalendar, FiMapPin, FiPlay, FiRefreshCw } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { auth, db } from '../../firebase-config.js';
import { collection, onSnapshot, query, where, doc, getDoc, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function TherapistAppointments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, 'callRequests'), where('therapistId', '==', uid), where('status', '==', 'accepted'));
    const unsub = onSnapshot(q, async (snap) => {
      const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Enrich each booking with patient details (name, email) for display
      const data = await Promise.all(base.map(async (r) => {
        if (r.uid) {
          try {
            const u = await getDoc(doc(db, 'users', r.uid));
            if (u.exists()) {
              const ud = u.data();
              return {
                ...r,
                patientId: u.id,
                patient: ud,
                patientName: ud.fullName || ud.name || ud.displayName || ud.email || 'Patient'
              };
            }
          } catch (e) {
            console.warn('appointments patient fetch failed:', e);
          }
        }
        return r;
      }));
      // Upcoming first by time
      data.sort((a,b) => (new Date(a.time||0).getTime()) - (new Date(b.time||0).getTime()));
      setRows(data);
      setLoading(false);
    }, err => {
      console.error('appointments load error', err);
      setRows([]);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const upcoming = useMemo(() => rows.filter(r => r.time && new Date(r.time).getTime() >= Date.now()), [rows]);
  const past = useMemo(() => rows.filter(r => !r.time || new Date(r.time).getTime() < Date.now()), [rows]);

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Appointments</h1>
          <p className="text-gray-600">Accepted bookings, updated in real time</p>
        </div>
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-100">
          <FiRefreshCw /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="h-28 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center text-gray-600 py-16">No accepted bookings yet.</div>
      ) : (
        <>
          <Section title={`Upcoming (${upcoming.length})`} items={upcoming} />
          <Section title={`Past (${past.length})`} items={past} />
        </>
      )}
    </div>
  );
}

function Section({ title, items }) {
  const saveMeetLink = async (item) => {
    try {
      const url = window.prompt('Paste Google Meet link here (starts with https://meet.google.com/):');
      if (!url) return;
      const valid = /^https:\/\/meet\.google\.com\//.test(url.trim());
      if (!valid) {
        alert('Please paste a valid Google Meet link (https://meet.google.com/...)');
        return;
      }
      const therapistId = auth.currentUser?.uid;
      if (!therapistId || !item?.uid) return;
      const pairId = `${therapistId}_${item.uid}`;
      await updateDoc(doc(db, 'callRequests', item.id), { meetingUrl: url.trim() });
      await setDoc(doc(db, 'patientTherapistPairs', pairId), { meetingUrl: url.trim(), updatedAt: serverTimestamp() }, { merge: true });
    } catch (e) {
      console.error('failed to save meet link', e);
    }
  };
  if (!items.length) return null;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-gray-800 mb-3">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map(item => (
          <div key={item.id} className="p-4 bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <FiCalendar /> {item.time ? new Date(item.time).toLocaleString() : 'No time set'}
              </div>
              <span className="text-xs px-2 py-1 rounded bg-green-50 text-green-700">Accepted</span>
            </div>
            <div className="font-semibold text-gray-800">{item.patientName || item.patient?.fullName || 'Patient'}</div>
            <div className="text-xs text-gray-500">{item.patient?.email || ''}{item.patient?.phone ? ` • ${item.patient.phone}` : ''}{(item.patient?.age || item.city) ? ` • ${item.patient?.age ? `Age: ${item.patient.age}` : ''}${item.patient?.age && item.city ? ' • ' : ''}${item.city || ''}` : ''}</div>
            <div className="text-sm text-gray-500 mt-1 flex items-center gap-2">
              <FiMapPin className="text-gray-400" /> {item.city || 'Online'}
            </div>
            <div className="mt-3 flex justify-end gap-3">
              {item.meetingUrl ? (
                <>
                  <a href={item.meetingUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                    <FiPlay /> Join
                  </a>
                  <button onClick={() => saveMeetLink(item)} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                    Change link
                  </button>
                </>
              ) : (
                <>
                  <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                    <FiPlay /> Open Google Meet
                  </a>
                  <button onClick={() => saveMeetLink(item)} className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800">
                    Save link
                  </button>
                </>
              )}
              <Link to={`/therapist/patients/${item.patientId || item.uid}`} className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800">
                View details →
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
