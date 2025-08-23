import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { auth, db } from '../../firebase-config.js';
import { collection, doc, getDoc, onSnapshot, orderBy, query, where, getDocs, updateDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

export default function TherapistPatientDetails() {
  const { patientId } = useParams();
  const [patient, setPatient] = useState(null);
  const [moods, setMoods] = useState([]);
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(true);

  useEffect(() => {
    let unsubMoods = () => {};
    (async () => {
      try {
        if (!auth.currentUser?.uid || !patientId) {
          console.warn('[TPD] Not authorized: missing auth or patientId', { uid: auth.currentUser?.uid, patientId });
          setAuthorized(false);
          setLoading(false);
          return;
        }

        // Basic authorization: verify a pair document exists (created on request/accept)
        const pairId = `${auth.currentUser.uid}_${patientId}`; // therapistId_patientId
        const pairRef = doc(db, 'patientTherapistPairs', pairId);
        const pairSnap = await getDoc(pairRef);
        if (!pairSnap.exists()) {
          console.warn('[TPD] Pair doc not found, denying access', { pairId });
          setAuthorized(false);
          setLoading(false);
          return;
        }
        const pair = { id: pairId, ...pairSnap.data() };
        console.debug('[TPD] Pair verified', pair);

        // Prefer booking info from the pair document (avoids composite index needs)
        if (pair) {
          // Only set booking if it contains meaningful info
          const hasBookingBits = pair.status || pair.time || pair.topic || pair.city;
          if (hasBookingBits) {
            setBooking({
              id: pair.id,
              status: pair.status,
              time: pair.time,
              topic: pair.topic,
              city: pair.city,
              meetingUrl: pair.meetingUrl || null,
            });
          }
        }

        // Load patient profile (may be restricted by rules)
        try {
          const uSnap = await getDoc(doc(db, 'users', patientId));
          if (uSnap.exists()) {
            const pdata = { id: uSnap.id, ...uSnap.data() };
            setPatient(pdata);
            console.debug('[TPD] Patient profile loaded');
          } else {
            console.warn('[TPD] Patient doc missing', { patientId });
          }
        } catch (e) {
          console.error('[TPD] Failed to load patient profile (rules?)', e);
          // Keep rendering with limited info from pair if available
        }

        // Load moods timeline (may be restricted by rules)
        try {
          const q = query(collection(db, 'users', patientId, 'moods'), orderBy('createdAt', 'desc'));
          unsubMoods = onSnapshot(q, (snap) => {
            setMoods(snap.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          }, (err) => {
            console.error('[TPD] Moods subscription error (rules?)', err);
            setLoading(false);
          });
        } catch (e) {
          console.error('[TPD] Failed to start moods subscription', e);
          setLoading(false);
        }

        // Secondary fallback: query latest accepted booking from callRequests (if rules permit)
        try {
          const bq = query(
            collection(db, 'callRequests'),
            where('therapistId', '==', auth.currentUser.uid),
            where('uid', '==', patientId),
            where('status', '==', 'accepted')
          );
          const snap = await getDocs(bq);
          const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          let best = null;
          const now = Date.now();
          for (const r of rows) {
            const t = r.time ? new Date(r.time).getTime() : 0;
            if (t && t >= now) {
              if (!best || t < new Date(best.time).getTime()) best = r;
            }
          }
          if (!best) {
            for (const r of rows) {
              const c = r.createdAt?.toDate?.()?.getTime?.() || 0;
              if (!best || c > (best.createdAt?.toDate?.()?.getTime?.() || 0)) best = r;
            }
          }
          if (best) setBooking((prev) => prev || best);
        } catch (e) {
          console.warn('[TPD] callRequests fetch skipped/failed (likely rules or index)', e);
        }
      } catch (outer) {
        console.error('[TPD] Unexpected error', outer);
        setLoading(false);
      }
    })();

    return () => unsubMoods();
  }, [patientId]);

  const chartData = useMemo(() => {
    // Build last 14 days timeline, using most recent mood per day
    const byDay = new Map();
    for (const m of moods) {
      const d = m.createdAt?.toDate ? m.createdAt.toDate() : new Date(m.createdAt || Date.now());
      const key = d.toISOString().slice(0,10);
      const score = Number(m.score);
      if (!byDay.has(key) || (m.createdAt?.toDate?.()?.getTime?.() || 0) > byDay.get(key).__ts) {
        byDay.set(key, { time: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), mood: isNaN(score)? null : score, __ts: d.getTime() });
      }
    }
    const res = [];
    const today = new Date();
    today.setHours(0,0,0,0);
    for (let i=13;i>=0;i--) {
      const d = new Date(today);
      d.setDate(d.getDate()-i);
      const key = d.toISOString().slice(0,10);
      const obj = byDay.get(key);
      res.push({ time: d.toLocaleDateString('en-US', { month:'short', day:'numeric' }), mood: obj? obj.mood : null });
    }
    return res;
  }, [moods]);

  if (!authorized) {
    return (
      <div className="p-6">
        <div className="max-w-3xl mx-auto bg-red-50 border border-red-200 p-6 rounded-xl">
          <h1 className="text-xl font-semibold text-red-700">Access denied</h1>
          <p className="text-red-700 mt-1">You don't have access to this patient's data.</p>
          <Link to="/therapist/dashboard" className="text-blue-700 hover:underline mt-3 inline-block">Back to dashboard</Link>
        </div>
      </div>
    );
  }

  const firstLetter = (patient?.fullName || patient?.name || patient?.displayName || 'P').charAt(0);
  const email = patient?.email || '';
  const phone = patient?.phone || patient?.phone1 || '';
  const city = patient?.city || '';
  const age = patient?.age;
  const bio = patient?.bio || '';

  return (
    <div className="p-6">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Patient Details</h1>
            <p className="text-gray-600">Overview of patient's recent moods and info</p>
          </div>
          <Link to="/therapist/appointments" className="text-blue-700 hover:underline">Go to Appointments →</Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => (<div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse"/>))}
          </div>
        ) : !patient ? (
          <div className="text-center text-gray-600 py-16">Limited details available. Patient profile may be restricted by security rules.</div>
        ) : (
          <>
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{firstLetter}</div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-gray-800">{patient.fullName || patient.name || 'Patient'}</div>
                  <div className="text-sm text-gray-500">{email}</div>
                  {phone && <div className="text-sm text-gray-500">{phone}</div>}
                  <div className="text-sm text-gray-500 flex gap-2">{age ? (<span>Age: {age}</span>) : null} {city && (<span>• {city}</span>)}</div>
                  {bio && <div className="mt-2 text-sm text-gray-700 line-clamp-3">{bio}</div>}
                </div>
                {booking && (
                  <div className="text-right text-sm">
                    <div className="font-semibold text-gray-800">Session</div>
                    {booking.time && <div className="text-gray-600">{new Date(booking.time).toLocaleString()}</div>}
                    {booking.city && <div className="text-gray-500">{booking.city}</div>}
                    {booking.topic && <div className="text-gray-500">Topic: {booking.topic}</div>}
                    {booking.status && <div className="text-gray-500">Status: {booking.status}</div>}
                    <div className="flex flex-col gap-1 items-end">
                      {booking.meetingUrl ? (
                        <a href={booking.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Join session</a>
                      ) : (
                        <>
                          <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Open Google Meet</a>
                          <button onClick={async () => {
                            try {
                              const url = window.prompt('Paste Google Meet link (https://meet.google.com/...)');
                              if (!url) return;
                              const valid = /^https:\/\/meet\.google\.com\//.test(url.trim());
                              if (!valid) { alert('Please paste a valid Google Meet link.'); return; }
                              const therapistId = auth.currentUser?.uid;
                              const pairId = `${therapistId}_${patientId}`;
                              await setDoc(doc(db, 'patientTherapistPairs', pairId), { meetingUrl: url.trim(), updatedAt: serverTimestamp() }, { merge: true });
                              // Update all accepted callRequests for this pair as well
                              const bq = query(collection(db, 'callRequests'), where('therapistId', '==', therapistId), where('uid', '==', patientId), where('status', '==', 'accepted'));
                              const snap = await getDocs(bq);
                              await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'callRequests', d.id), { meetingUrl: url.trim() })));
                              setBooking(prev => ({ ...(prev || {}), meetingUrl: url.trim() }));
                            } catch (e) {
                              console.error('save meet link failed', e);
                            }
                          }} className="text-blue-600 hover:underline">Save link</button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-800 mb-3">Mood trend (last 14 days)</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="time" stroke="#4B5563" />
                    <YAxis domain={[1,5]} allowDecimals={false} stroke="#4B5563" />
                    <Tooltip />
                    <Line type="monotone" dataKey="mood" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

