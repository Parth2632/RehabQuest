import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { User, Award, MapPin, Clock, CheckCircle, Calendar, Phone, Mail, Users } from 'lucide-react';
import { auth, db } from '../../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, getDoc, onSnapshot, query, updateDoc, where, setDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { useTherapistStatus, isTherapistOnline } from '../../hooks/useTherapistStatus.js';

function TherapistDashboard() {
  const [role, setRole] = useState(null); // 'therapist' | 'patient' | null
  const [roleLoading, setRoleLoading] = useState(true);

  // Therapist state
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);

  // Patient-facing therapist list state
  const [therapists, setTherapists] = useState([]);
  const [therapistsLoading, setTherapistsLoading] = useState(true);

  // Keep therapist online status up to date if logged in as therapist
  useTherapistStatus();

  // Detect role in real-time based on Firestore docs
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setRole(null);
        setRoleLoading(false);
        return;
      }
      try {
        console.log('Checking role for user:', user.uid);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const roleValue = userData.userType === 'therapist' ? 'therapist' : 'patient';
          console.log('User role determined:', roleValue, 'UserType:', userData.userType);
          console.log('User data:', userData);
          
          // Auto-approve existing patients who don't have verification status
          if (userData.userType === 'patient' && !userData.verificationStatus && !userData.verified) {
            try {
              const { updateDoc } = await import('firebase/firestore');
              await updateDoc(doc(db, 'users', user.uid), {
                verificationStatus: 'approved',
                verified: true
              });
              console.log('Auto-approved existing patient account');
            } catch (error) {
              console.error('Error auto-approving patient:', error);
            }
          }
          
          setRole(roleValue);
        } else {
          console.log('User document does not exist');
          setRole('patient');
        }
      } catch (e) {
        console.error('Error determining role:', e);
        setRole('patient');
      } finally {
        setRoleLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Real-time therapists list for patients (approved only)
  useEffect(() => {
    if (role !== 'patient') return;
    setTherapistsLoading(true);
    const q = query(collection(db, 'users'), where('userType', '==', 'therapist'));
    const unsub = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const approved = all.filter((t) => (t.verificationStatus || (t.verified ? 'approved' : 'pending')) === 'approved');
      // Sort: online first, then experience desc, then name asc
      approved.sort((a, b) => {
        const ao = isTherapistOnline(a) ? 1 : 0;
        const bo = isTherapistOnline(b) ? 1 : 0;
        if (ao !== bo) return bo - ao; // online first
        const ae = Number(a.experience || 0);
        const be = Number(b.experience || 0);
        if (ae !== be) return be - ae;
        return (a.name || '').localeCompare(b.name || '');
      });
      setTherapists(approved);
      setTherapistsLoading(false);
    }, (err) => {
      console.error('Error loading therapists:', err);
      setTherapists([]);
      setTherapistsLoading(false);
    });
    return () => unsub();
  }, [role]);

  // Real-time patient requests/assignments for therapist
  useEffect(() => {
    if (role !== 'therapist' || !auth.currentUser?.uid) return;
    setBookingsLoading(true);
    const q = query(collection(db, 'callRequests'), where('therapistId', '==', auth.currentUser.uid));
    const unsub = onSnapshot(q, async (snap) => {
      // Fetch patient details for each request and filter strictly to patients
      const rows = await Promise.all(snap.docs.map(async (d) => {
        const data = { id: d.id, ...d.data() };
        if (data.uid) {
          try {
            const u = await getDoc(doc(db, 'users', data.uid));
            if (u.exists()) {
              const ud = u.data();
              if (ud.userType === 'patient') {
                data.patient = ud;
                data.patientId = u.id;
                return data;
              }
            }
          } catch (e) {
            console.warn('patient fetch failed:', e);
          }
        }
        return null; // exclude non-patients or failures
      }));

      const onlyPatients = rows.filter(Boolean);

      // Sort: pending first, then upcoming by time, then newest created
      onlyPatients.sort((a, b) => {
        const sa = (a.status || 'requested');
        const sb = (b.status || 'requested');
        if (sa !== sb) {
          const rank = (s) => (s === 'requested' ? 0 : s === 'accepted' ? 1 : 2);
          return rank(sa) - rank(sb);
        }
        const at = a.time ? new Date(a.time).getTime() : 0;
        const bt = b.time ? new Date(b.time).getTime() : 0;
        if (at !== bt) return at - bt;
        const ac = a.createdAt?.toDate?.()?.getTime?.() || 0;
        const bc = b.createdAt?.toDate?.()?.getTime?.() || 0;
        return bc - ac;
      });

      setBookings(onlyPatients);
      setBookingsLoading(false);
    }, (err) => {
      console.error('Error loading patient requests:', err);
      setBookings([]);
      setBookingsLoading(false);
    });
    return () => unsub();
  }, [role]);

  const counts = useMemo(() => {
    const c = { pending: 0, accepted: 0, completed: 0 };
    for (const b of bookings) {
      const s = (b.status || 'requested');
      if (s === 'requested') c.pending++;
      else if (s === 'accepted') c.accepted++;
      else if (s === 'completed') c.completed++;
    }
    return c;
  }, [bookings]);

  // Unique patient totals: count each patient once if they have any accepted or requested booking
  const uniquePatients = useMemo(() => {
    const active = new Set();
    const pending = new Set();
    for (const b of bookings) {
      const s = (b.status || 'requested');
      const pid = b.patientId || b.uid;
      if (!pid) continue;
      if (s === 'accepted') active.add(pid);
      else if (s === 'requested') pending.add(pid);
    }
    // Precedence: accepted > requested. Pending should exclude anyone already in active.
    const pendingOnly = new Set([...pending].filter(pid => !active.has(pid)));
    const total = new Set([...active, ...pendingOnly]).size;
    return { active: active.size, pending: pendingOnly.size, total };
  }, [bookings]);

  const updateBookingStatus = async (id, status) => {
    try {
      const booking = bookings.find(b => b.id === id);
      const crRef = doc(db, 'callRequests', id);

      // Only update status here; meeting links will be handled via explicit actions (Open/Save)
      await updateDoc(crRef, { status });

      // Also upsert the pair document so access rules can grant visibility
      if (booking?.uid && booking?.therapistId) {
        const pairId = `${booking.therapistId}_${booking.uid}`;
        await setDoc(doc(db, 'patientTherapistPairs', pairId), {
          pairId,
          therapistId: booking.therapistId,
          patientId: booking.uid,
          status,
          topic: booking.topic || null,
          city: booking.city || null,
          time: booking.time || null,
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }
    } catch (e) {
      console.error('Failed to update booking:', e);
    }
  };

  // Save/Change Google Meet link for a booking
  const saveMeetLinkFor = async (booking) => {
    try {
      const url = window.prompt('Paste Google Meet link (https://meet.google.com/...)');
      if (!url) return;
      const valid = /^https:\/\/meet\.google\.com\//.test(url.trim());
      if (!valid) { alert('Please paste a valid Google Meet link.'); return; }
      await updateDoc(doc(db, 'callRequests', booking.id), { meetingUrl: url.trim() });
      if (booking?.therapistId && booking?.uid) {
        const pairId = `${booking.therapistId}_${booking.uid}`;
        await setDoc(doc(db, 'patientTherapistPairs', pairId), { meetingUrl: url.trim(), updatedAt: serverTimestamp() }, { merge: true });
      }
    } catch (e) {
      console.error('failed to save meet link (dashboard)', e);
    }
  };

  // Mark session as completed. This unlocks the patient to book someone else
  const completeSession = async (booking) => {
    try {
      const ok = window.confirm('Mark this session as completed? This will unlock the patient to book another therapist.');
      if (!ok) return;
      // Update pair status to completed
      if (booking?.therapistId && booking?.uid) {
        const pairId = `${booking.therapistId}_${booking.uid}`;
        await setDoc(doc(db, 'patientTherapistPairs', pairId), { status: 'completed', updatedAt: serverTimestamp() }, { merge: true });
        // Update all accepted requests for this pair to completed
        const q = query(collection(db, 'callRequests'), where('therapistId', '==', booking.therapistId), where('uid', '==', booking.uid), where('status', '==', 'accepted'));
        const snap = await getDocs(q);
        await Promise.all(snap.docs.map(d => updateDoc(doc(db, 'callRequests', d.id), { status: 'completed', completedAt: serverTimestamp() })));
      }
    } catch (e) {
      console.error('complete session failed', e);
    }
  };

  if (roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Patient view: professional therapist list with online/offline indicators
  if (role !== 'therapist') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Debug info */}
          <div className="mb-4 p-4 bg-yellow-100 border border-yellow-300 rounded-lg">
            <h3 className="font-semibold text-yellow-800">Debug Info:</h3>
            <p className="text-yellow-700">Current Role: <strong>{role || 'null'}</strong></p>
            <p className="text-yellow-700">User ID: <strong>{auth.currentUser?.uid || 'Not logged in'}</strong></p>
            <p className="text-yellow-700">Expected: Role should be 'therapist' to see dashboard</p>
          </div>
          <h1 className="text-2xl font-bold text-blue-700 mb-2">Find a Therapist</h1>
          <p className="text-gray-600 mb-6">Browse verified therapists and see who is online.</p>

          {therapistsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm animate-pulse h-28"></div>
              ))}
            </div>
          ) : therapists.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-blue-100 text-center text-gray-600">No therapists available yet.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {therapists.map(t => {
                const online = isTherapistOnline(t);
                const initials = (t.name || 'Therapist').split(' ').map(n => n[0]).slice(0,2).join('').toUpperCase();
                return (
                  <motion.div whileHover={{y:-2}} key={t.id} className="bg-white p-6 rounded-xl border-2 border-transparent hover:border-blue-200 shadow-sm cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="relative">
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold">{initials}</div>
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${online ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-gray-900 truncate">{t.name}</h3>
                          <span className={`px-2 py-1 rounded-full text-xs ${online ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{online ? 'Online' : 'Offline'}</span>
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                          <Award size={14} /> {t.degree || 'Licensed Therapist'}
                        </div>
                        <div className="text-sm text-gray-600 flex items-center gap-2">
                          <MapPin size={14} /> {t.location || '—'}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(t.specialties || []).slice(0,3).map((s, i) => (
                            <span key={i} className="px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-full">{s}</span>
                          ))}
                          {Array.isArray(t.specialties) && t.specialties.length > 3 && (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">+{t.specialties.length - 3} more</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Therapist view: real-time bookings and stats
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-blue-700">Therapist Dashboard</h1>
          <p className="text-gray-600">Manage your bookings in real time.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {[
            {label: 'Pending', value: bookingsLoading ? '—' : uniquePatients.pending, color: 'bg-yellow-50 text-yellow-700', icon: Clock},
            {label: 'Accepted', value: bookingsLoading ? '—' : uniquePatients.active, color: 'bg-green-50 text-green-700', icon: CheckCircle},
            {label: 'Completed', value: bookingsLoading ? '—' : counts.completed, color: 'bg-blue-50 text-blue-700', icon: Calendar},
          ].map((s, i) => (
            <div key={i} className={`rounded-xl border border-blue-100 p-4 flex items-center gap-3 ${s.color}`}>
              <s.icon size={18} />
              <div className="flex-1">
                <div className="text-sm">{s.label}</div>
                <div className="text-xl font-bold">{s.value}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Patients section: Pending requests and Active patients */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-blue-700">Patients</h2>
            <div className="text-sm text-gray-500">{bookingsLoading ? '—' : uniquePatients.total} total</div>
          </div>

          {bookingsLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center text-gray-600 py-12">No patient requests yet.</div>
          ) : (
            <div className="space-y-6">
              {/* Pending Requests */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Pending Patient Requests</h3>
                  <span className="text-xs text-gray-500">{uniquePatients.pending} pending</span>
                </div>
                <div className="space-y-3">
                  {bookings.filter(b => (b.status || 'requested') === 'requested').map(b => {
                    const name = b.patient?.fullName || 'Patient';
                    const email = b.patient?.email || '—';
                    const reason = b.topic || b.reason || '—';
                    const time = b.time ? new Date(b.time).toLocaleString() : 'No time set';
                    return (
                      <div key={b.id} className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">{(name||'P').charAt(0)}</div>
                            <div>
                              <div className="font-medium text-gray-800">{name}</div>
                              <div className="text-sm text-gray-600">{email}</div>
                              <div className="text-sm text-gray-600 mt-1">Reason: {reason}</div>
                              <div className="text-xs text-gray-500 mt-1"><Clock className="inline w-3 h-3 mr-1" /> {time}</div>
                            </div>
                          </div>
                          <div className="flex gap-2 self-end sm:self-auto">
                            <button onClick={() => updateBookingStatus(b.id, 'accepted')} className="px-3 py-1.5 text-sm rounded bg-green-600 text-white hover:bg-green-700">Accept Patient</button>
                            <button onClick={() => updateBookingStatus(b.id, 'declined')} className="px-3 py-1.5 text-sm rounded bg-red-100 text-red-700 hover:bg-red-200">Reject</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Active Patients */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold text-gray-800">Active Patients</h3>
                  <span className="text-xs text-gray-500">{uniquePatients.active} active</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {bookings.filter(b => (b.status || 'requested') === 'accepted').map(b => {
                    const name = b.patient?.fullName || 'Patient';
                    const email = b.patient?.email || '—';
                    const reason = b.topic || b.reason || '—';
                    const time = b.time ? new Date(b.time).toLocaleString() : 'No time set';
                    return (
                      <div key={b.id} className="p-4 border border-green-200 bg-green-50 rounded-lg">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">{(name||'P').charAt(0)}</div>
                          <div className="min-w-0 flex-1">
                            <div className="font-medium text-gray-800 truncate">{name}</div>
                            <div className="text-sm text-gray-600 truncate">{email}</div>
                            <div className="text-sm text-gray-600 mt-1 truncate">Reason: {reason}</div>
                            <div className="text-xs text-gray-500 mt-1"><Clock className="inline w-3 h-3 mr-1" /> {time}</div>
                            <div className="mt-2 flex flex-wrap items-center gap-3">
                              {b.meetingUrl ? (
                                <>
                                  <a href={b.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline">Join</a>
                                  <button onClick={() => saveMeetLinkFor(b)} className="text-sm text-blue-700 hover:underline">Change link</button>
                                </>
                              ) : (
                                <>
                                  <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="text-sm text-blue-700 hover:underline">Open Google Meet</a>
                                  <button onClick={() => saveMeetLinkFor(b)} className="text-sm text-blue-700 hover:underline">Save link</button>
                                </>
                              )}
                              <Link to={`/therapist/patients/${b.patientId || b.uid}`} className="text-sm text-gray-700 hover:underline">View patient details →</Link>
                              <button onClick={() => completeSession(b)} className="text-sm text-green-700 hover:underline">Complete session</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default TherapistDashboard;
