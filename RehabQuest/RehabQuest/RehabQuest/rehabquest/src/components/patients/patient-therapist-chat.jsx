import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../../firebase-config.js';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { MessageCircle, Send, User } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';

export default function PatientTherapistChat() {
  const [currentUser, setCurrentUser] = useState(auth.currentUser);
  const [pairs, setPairs] = useState([]); // [{id, therapistId, status, topic, meetingUrl, therapist:{...}}]
  const [selectedTherapist, setSelectedTherapist] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [meetingUrl, setMeetingUrl] = useState(null);
  const [acceptedSet, setAcceptedSet] = useState(new Set());

  const [searchParams] = useSearchParams();

  // Keep auth reactive so queries run after login
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setCurrentUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    // Listen to accepted bookings to derive status when pair doc is stale
    const acceptedQ = query(
      collection(db, 'callRequests'),
      where('uid', '==', currentUser.uid),
      where('status', '==', 'accepted')
    );
    const unsubAccepted = onSnapshot(acceptedQ, (snap) => {
      const ids = new Set(snap.docs.map(d => d.data().therapistId).filter(Boolean));
      setAcceptedSet(ids);
    });

    const q = query(
      collection(db, 'patientTherapistPairs'),
      where('patientId', '==', currentUser.uid)
    );
    const unsub = onSnapshot(q, async (snap) => {
      const base = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const rows = await Promise.all(base.map(async p => {
        try {
          const tDoc = await getDoc(doc(db, 'users', p.therapistId));
          return { ...p, therapist: tDoc.exists() ? { id: tDoc.id, ...tDoc.data() } : { id: p.therapistId } };
        } catch {
          return { ...p, therapist: { id: p.therapistId } };
        }
      }));
      setPairs(rows);
      setLoading(false);
      // auto-select from ?t=<therapistId>
      const tid = searchParams.get('t');
      if (tid && !selectedTherapist) {
        const found = rows.find(r => r.therapist?.id === tid);
        if (found) setSelectedTherapist(found.therapist);
      }
    });
    return () => { unsub(); unsubAccepted(); };
  }, [currentUser, searchParams]);

  useEffect(() => {
    if (!currentUser || !selectedTherapist) return;
    const chatId = `${selectedTherapist.id}_${currentUser.uid}`; // therapistId_patientId to match therapist dashboard
    const q = query(collection(db, 'therapistChats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, (snap) => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data(), ts: d.data().createdAt?.toDate?.() || new Date() })));
    });
    // also fetch meetingUrl from pair
    (async () => {
      try {
        const pairId = `${selectedTherapist.id}_${currentUser.uid}`;
        const pairSnap = await getDoc(doc(db, 'patientTherapistPairs', pairId));
        if (pairSnap.exists()) setMeetingUrl(pairSnap.data().meetingUrl || null);
      } catch {}
    })();
    return unsub;
  }, [currentUser, selectedTherapist]);

  const send = async (e) => {
    e.preventDefault();
    if (!currentUser || !selectedTherapist) return;
    const textToSend = text.trim();
    if (!textToSend) return;
    // Optimistically clear input so it doesn't appear to "stick"
    setText('');
    const chatId = `${selectedTherapist.id}_${currentUser.uid}`;
    try {
      await addDoc(collection(db, 'therapistChats', chatId, 'messages'), {
        text: textToSend,
        senderId: currentUser.uid,
        senderType: 'patient',
        senderName: currentUser.displayName || 'Patient',
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('chat send failed', err);
      // Restore text if send fails
      setText(textToSend);
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">Please log in.</div>
    );
  }

  const tName = (t) => {
    const base = (t?.name || t?.fullName || t?.displayName || t?.email || 'Therapist').trim();
    return /^(Dr\.?\s)/i.test(base) ? base : `Dr. ${base}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
        {/* Therapist list */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-xl font-semibold text-blue-700 mb-3">Your Therapists</h2>
          {loading && <p className="text-gray-500">Loading...</p>}
          {!loading && pairs.length === 0 && (
            <p className="text-gray-500">No therapist linked yet.</p>
          )}
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {pairs.map(p => (
              <button key={p.id} onClick={() => { setSelectedTherapist(p.therapist); setMeetingUrl(p.meetingUrl || null); }}
                className={`w-full text-left p-3 rounded border ${selectedTherapist?.id === p.therapist.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
                <div className="flex items-center gap-2">
                  <User size={16} className="text-blue-500" />
                  <span className="font-medium text-gray-800">{tName(p.therapist)}</span>
                </div>
                {p.therapist?.degree && (
                  <div className="text-xs text-gray-600 truncate">🎓 {p.therapist.degree}</div>
                )}
                {p.therapist?.hospital && (
                  <div className="text-xs text-gray-600 truncate">🏥 {p.therapist.hospital}</div>
                )}
                <div className="text-xs text-gray-600 truncate">📍 {p.therapist?.city || p.therapist?.location || 'Online'}</div>
                <div className="text-xs text-gray-600 truncate">💼 {p.therapist?.experience || 0} years exp.</div>
                {(p.therapist?.phone1 || p.therapist?.phone) && (
                  <div className="text-xs text-gray-600 truncate">📞 {p.therapist?.phone1 || p.therapist?.phone}</div>
                )}
                <div className="text-xs text-gray-500">Status: {(acceptedSet.has(p.therapistId) ? 'accepted' : (p.status || 'requested'))}{p.topic ? ` • Topic: ${p.topic}` : ''}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Chat */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          {!selectedTherapist ? (
            <div className="p-8 text-center text-gray-500">
              <MessageCircle className="mx-auto mb-2 text-gray-300" size={48} />
              Select a therapist to start chatting.
            </div>
          ) : (
            <>
              <div className="border-b border-blue-100 p-4 flex items-center justify-between">
                <h3 className="font-semibold text-blue-700 flex items-center gap-2">
                  <MessageCircle size={18} />
                  Chat with {tName(selectedTherapist)}
                </h3>
                {meetingUrl && (
                  <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="text-sm px-3 py-1.5 rounded-lg bg-green-600 text-white">Join Meet</a>
                )}
              </div>
              <div className="h-80 overflow-y-auto p-4 space-y-3">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderType === 'patient' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg ${m.senderType === 'patient' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'}`}>
                      <p className="text-sm">{m.text}</p>
                      <p className={`text-xs mt-1 ${m.senderType === 'patient' ? 'text-blue-100' : 'text-gray-500'}`}>{m.ts.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="border-t border-blue-100 p-4 flex gap-2">
                <input className="flex-1 p-2 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Type a message" value={text} onChange={e => setText(e.target.value)} />
                <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} type="submit" disabled={!text.trim()} className="bg-blue-500 text-white p-2 rounded-lg disabled:opacity-50">
                  <Send size={18} />
                </motion.button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
