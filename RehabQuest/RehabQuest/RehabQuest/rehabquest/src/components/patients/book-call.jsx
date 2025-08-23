import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, Link, useSearchParams } from "react-router-dom";
import { db, auth } from "../../firebase-config.js";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection, serverTimestamp, query, doc, setDoc, where, onSnapshot, getDoc, getDocs, updateDoc } from "firebase/firestore";
import TherapistList from '../shared/TherapistList.jsx';

export default function BookCall() {
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [form, setForm] = useState({ city: "", topic: "", time: "" });
  const [status, setStatus] = useState("");
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [myPairs, setMyPairs] = useState([]); // [{pairId, therapistId, status, meetingUrl, ...}]
  const [myTherapists, setMyTherapists] = useState([]); // joined therapist docs
  const [fallbackTherapists, setFallbackTherapists] = useState([]); // from callRequests if no pair doc yet
  const [currentUser, setCurrentUser] = useState(auth.currentUser || null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Keep auth state reactive
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const formatName = (t) => {
    if (!t) return 'Therapist';
    const base = (t.name || t.fullName || t.displayName || 'Therapist').trim();
    return /^(Dr\.?\s)/i.test(base) ? base : `Dr. ${base}`;
  };

const handleTherapistSelect = (therapist) => {
    setSelectedTherapist(therapist);
    setShowBookingForm(true);
  };

  // Load "my therapist(s)" for this patient from pair mappings
  useEffect(() => {
    const user = currentUser;
    if (!user?.uid) return;
    const q = query(
      collection(db, 'patientTherapistPairs'),
      where('patientId', '==', user.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const pairs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMyPairs(pairs);
      // Fetch therapist docs for each pair
      const therapistDocs = await Promise.all(pairs.map(async p => {
        try {
          const t = await getDoc(doc(db, 'users', p.therapistId));
          return t.exists() ? { id: t.id, ...t.data() } : null;
        } catch { return null; }
      }));
      setMyTherapists(therapistDocs.filter(Boolean));
    });
    return () => unsub();
  }, [currentUser?.uid]);

  // Preselect therapist when ?t=<therapistId> is present
  useEffect(() => {
    const tid = searchParams.get('t');
    if (!tid) return;
    (async () => {
      try {
        const tDoc = await getDoc(doc(db, 'users', tid));
        if (tDoc.exists()) {
          const t = { id: tDoc.id, ...tDoc.data() };
          setSelectedTherapist(t);
          setShowBookingForm(true);
        }
      } catch (e) {
        console.warn('Failed to preselect therapist', e);
      }
    })();
  }, [searchParams]);

  // Fallback: if pair doc not created yet (older bookings), derive "my therapist" from callRequests
  useEffect(() => {
    const user = currentUser;
    if (!user?.uid) return;
    const q = query(collection(db, 'callRequests'), where('uid', '==', user.uid));
    const unsub = onSnapshot(q, async (snap) => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Aggregate per therapist: accepted > requested > declined/canceled
      const agg = new Map();
      for (const r of rows) {
        if (!r.therapistId) continue;
        const a = agg.get(r.therapistId) || { accepted:false, requested:false, declined:false, canceled:false, latest:r };
        if ((r.createdAt?.toDate?.()?.getTime?.()||0) > (a.latest?.createdAt?.toDate?.()?.getTime?.()||0)) a.latest = r;
        const s = (r.status || 'requested').toLowerCase();
        if (s === 'accepted') a.accepted = true;
        else if (s === 'requested') a.requested = true;
        else if (s === 'declined') a.declined = true;
        else if (s === 'canceled') a.canceled = true;
        agg.set(r.therapistId, a);
      }
      const list = Array.from(agg.entries());
      const therapists = await Promise.all(list.map(async ([tid, a]) => {
        try {
          const t = await getDoc(doc(db, 'users', tid));
          if (t.exists()) {
            const derived = a.accepted ? 'accepted' : (a.requested ? 'requested' : (a.declined ? 'declined' : (a.canceled ? 'canceled' : 'requested')));
            return { id: t.id, ...t.data(), __status: derived };
          }
        } catch {}
        return null;
      }));
      setFallbackTherapists(therapists.filter(Boolean));
    });
    return () => unsub();
  }, [currentUser?.uid]);

  const submit = async (e) => {
    e.preventDefault();
    if (!selectedTherapist || !currentUser) return;
    
    setIsSubmitting(true);
    setStatus("");
    
    try {
      // Create the booking request (history of requests)
      await addDoc(collection(db, "callRequests"), {
        uid: currentUser.uid,
        therapistId: selectedTherapist.id,
        city: form.city.trim(),
        topic: form.topic.trim(),
        time: form.time,
        status: 'requested',
        createdAt: serverTimestamp(),
      });

      // Also create/update a deterministic pair mapping so therapists can see patient details via rules
      const pairId = `${selectedTherapist.id}_${currentUser.uid}`; // therapistId_patientId
      await setDoc(doc(db, "patientTherapistPairs", pairId), {
        pairId,
        therapistId: selectedTherapist.id,
        patientId: currentUser.uid,
        status: 'requested',
        topic: form.topic.trim(),
        city: form.city.trim(),
        time: form.time || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true });
      
      setStatus("Booking request submitted successfully! Your therapist will receive your request.");
      setForm({ city: "", topic: "", time: "" });
      setSelectedTherapist(null);
      setShowBookingForm(false);
      
      // Navigate to chat page after a short delay
      setTimeout(() => {
        navigate('/pt-chat');
      }, 2000);
      
    } catch (err) {
      console.error('Error submitting booking request:', err);
      setStatus("Failed to submit request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToList = () => {
    setShowBookingForm(false);
    setSelectedTherapist(null);
    setStatus("");
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-8 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Please Log In</h2>
          <p className="text-gray-600 mb-4">You need to be logged in to book a session with a therapist.</p>
          <Link 
            to="/auth" 
            className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          >
            Login / Register
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">Book a Session</h1>
          <p className="text-gray-600">
            {showBookingForm 
              ? `Complete your booking with ${formatName(selectedTherapist)}` 
              : (myTherapists.length > 0
                  ? 'You have a therapist linked. Chat or join your session, or book/reschedule.'
                  : 'Choose from our available therapists and schedule your session')
            }
          </p>
        </div>

        {!showBookingForm ? (
          /* Therapist Selection */
            <div className="max-w-4xl mx-auto">
            {myTherapists.length > 0 || fallbackTherapists.length > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-xl font-semibold text-gray-800">My Therapist{myTherapists.length>1?'s':''}</h2>
                  <div className="text-sm text-gray-500">{(myTherapists.length>0? myTherapists.length : fallbackTherapists.length)} linked</div>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {(myTherapists.length>0? myTherapists : fallbackTherapists).map((t) => {
                    const pair = myPairs.find(p => p.therapistId === t.id);
                    // Look up derived status from callRequests even when rendering myTherapists
                    const derivedFromRequests = fallbackTherapists.find(f => f.id === t.id)?.__status || t.__status;
                    const status = (pair?.status === 'accepted' || derivedFromRequests === 'accepted')
                      ? 'accepted'
                      : (pair?.status === 'requested' || derivedFromRequests === 'requested')
                        ? 'requested'
                        : (pair?.status || derivedFromRequests || 'requested');
                    const initials = (t.name || t.fullName || 'Therapist').split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();
                    return (
                      <motion.div key={t.id} whileHover={{y:-2}} className="bg-white rounded-xl p-6 shadow-sm border border-blue-100">
                        <div className="flex items-start gap-4">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white flex items-center justify-center font-bold">{initials}</div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-lg truncate">{formatName(t)}</div>
                            <div className="text-sm text-gray-600">{t.degree || 'Licensed Therapist'}</div>
                            {t.hospital && (
                              <div className="text-sm text-gray-600 mt-1 truncate">🏥 {t.hospital}</div>
                            )}
                            <div className="text-sm text-gray-600 mt-1 truncate">📍 {t.city || t.location || 'Online'}</div>
                            <div className="text-sm text-gray-600 mt-1 truncate">💼 {t.experience || 0} years exp.</div>
                            {(t.phone1 || t.phone) && (
                              <div className="text-sm text-gray-600 mt-1 truncate">📞 {t.phone1 || t.phone}</div>
                            )}
                            <div className="text-xs text-gray-500 mt-1">Status: {status}</div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {status === 'accepted' ? (
                                <Link to={`/patient/pt-chat?t=${t.id}`} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Chat</Link>
                              ) : (
                                <span className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-sm">Chat after acceptance</span>
                              )}
                              {pair?.meetingUrl ? (
                                <a href={pair.meetingUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">Join Meet</a>
                              ) : (
                                <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">Open Meet</a>
                              )}
                              <button onClick={async () => {
                                // Reschedule: allow selecting a new datetime and update pair + accepted callRequests
                                const newTime = window.prompt('Enter new date/time (YYYY-MM-DD HH:MM in your local time)');
                                if (!newTime) return;
                                try {
                                  const iso = new Date(newTime.replace(' ', 'T')).toISOString();
                                  await setDoc(doc(db,'patientTherapistPairs', `${t.id}_${currentUser.uid}`), { time: iso, updatedAt: serverTimestamp() }, { merge:true });
                                  const q = query(collection(db,'callRequests'), where('uid','==', currentUser.uid), where('therapistId','==', t.id), where('status','==','accepted'));
                                  const snap = await getDocs(q);
                                  await Promise.all(snap.docs.map(d=> updateDoc(doc(db,'callRequests', d.id), { time: iso })));
                                } catch(e) { console.error('reschedule failed', e); }
                              }} className="px-3 py-1.5 rounded-lg bg-white border border-blue-200 text-blue-700 text-sm hover:bg-blue-50">{status==='accepted' ? 'Reschedule' : 'Book'}</button>
                              {status==='accepted' && (
                                <button onClick={async () => {
                                  try {
                                    const q = query(collection(db,'callRequests'), where('uid','==', currentUser.uid), where('therapistId','==', t.id), where('status','==','accepted'));
                                    const snap = await getDocs(q);
                                    await Promise.all(snap.docs.map(d=> updateDoc(doc(db,'callRequests', d.id), { status:'canceled' })));
                                    await setDoc(doc(db,'patientTherapistPairs', `${t.id}_${currentUser.uid}`), { status:'canceled', updatedAt: serverTimestamp() }, { merge:true });
                                  } catch(e) { console.error('cancel failed', e); }
                                }} className="px-3 py-1.5 rounded-lg bg-red-50 text-red-700 text-sm hover:bg-red-100">Cancel booking</button>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                <div className="pt-2 text-sm text-gray-600">Looking for someone else? Choose from all available therapists below.</div>
                <TherapistList 
                  onSelectTherapist={handleTherapistSelect}
                  selectedTherapistId={selectedTherapist?.id}
                  showBookingButton={true}
                  activeTherapistId={(myPairs.find(p=> (p.status==='accepted'))?.therapistId) || null}
                />
              </div>
            ) : (
              <TherapistList 
                onSelectTherapist={handleTherapistSelect}
                selectedTherapistId={selectedTherapist?.id}
                showBookingButton={true}
                activeTherapistId={(myPairs.find(p=> (p.status==='accepted'))?.therapistId) || null}
              />
            )}
          </div>
        ) : (
          /* Booking Form */
          <div className="max-w-2xl mx-auto">
            {/* Selected Therapist Info */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                    {(selectedTherapist.name || selectedTherapist.fullName || 'T').charAt(0)}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-gray-800">{formatName(selectedTherapist)}</h3>
                    <p className="text-gray-600">{selectedTherapist.degree || 'Licensed Therapist'}</p>
                    {selectedTherapist.hospital && (
                      <div className="text-sm text-gray-600 mt-1">🏥 {selectedTherapist.hospital}</div>
                    )}
                    <div className="flex flex-wrap items-center mt-1 gap-x-4 gap-y-1">
                      <span className="text-sm text-gray-500">📍 {selectedTherapist.city || selectedTherapist.location || 'Online'}</span>
                      <span className="text-sm text-gray-500">💼 {selectedTherapist.experience || 0} years exp.</span>
                      {(selectedTherapist.phone1 || selectedTherapist.phone) && (
                        <span className="text-sm text-gray-500">📞 {selectedTherapist.phone1 || selectedTherapist.phone}</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Quick actions: Chat / Join if already paired */}
                <div className="flex gap-2">
                  {myPairs.some(p => p.therapistId === selectedTherapist.id) && (
                    <>
                      {(() => {
                        const pair = myPairs.find(p => p.therapistId === selectedTherapist.id);
                        const derived = fallbackTherapists.find(f => f.id === selectedTherapist.id)?.__status;
                        const isAccepted = pair?.status === 'accepted' || derived === 'accepted';
                        return isAccepted ? (
                          <Link to={`/patient/pt-chat?t=${selectedTherapist.id}`} className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">Chat</Link>
                        ) : (
                          <span className="px-3 py-1.5 rounded-lg bg-gray-200 text-gray-600 text-sm">Chat after acceptance</span>
                        );
                      })()}
                      {myPairs.find(p => p.therapistId === selectedTherapist.id)?.meetingUrl ? (
                        <a href={myPairs.find(p => p.therapistId === selectedTherapist.id)?.meetingUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700">Join Meet</a>
                      ) : (
                        <a href="https://meet.new" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm hover:bg-gray-200">Open Meet</a>
                      )}
                    </>
                  )}
                </div>
              </div>
              <button 
                onClick={handleBackToList}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
              >
                ← Choose Different Therapist
              </button>
            </div>

            {/* Booking Form */}
            <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
              <form onSubmit={submit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Your Location</label>
                  <input
                    name="city"
                    value={form.city}
                    onChange={onChange}
                    placeholder="City, State (e.g., New York, NY)"
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Session Topic</label>
                  <input
                    name="topic"
                    value={form.topic}
                    onChange={onChange}
                    placeholder="What would you like to discuss? (e.g., anxiety, stress, relationships)"
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Date & Time</label>
                  <input
                    type="datetime-local"
                    name="time"
                    value={form.time}
                    onChange={onChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Your therapist will confirm the exact time based on their availability.</p>
                </div>

                <motion.button 
                  whileHover={{ scale: 1.02 }} 
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3 rounded-lg font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  {isSubmitting ? 'Submitting Request...' : 'Submit Booking Request'}
                </motion.button>
              </form>

              {status && (
                <div className={`mt-6 p-4 rounded-lg ${
                  status.includes('Failed') 
                    ? 'bg-red-50 border border-red-200 text-red-700'
                    : 'bg-green-50 border border-green-200 text-green-700'
                }`}>
                  <p>{status}</p>
                  {status.includes('successfully') && (
                    <Link 
                      to="/pt-chat" 
                      className="mt-3 inline-block bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Go to Chat →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
