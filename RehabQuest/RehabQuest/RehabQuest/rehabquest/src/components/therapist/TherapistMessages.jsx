import React, { useEffect, useMemo, useState } from 'react';
import { FiMessageSquare, FiSearch, FiSend } from 'react-icons/fi';
import { auth, db } from '../../firebase-config.js';
import { addDoc, collection, onSnapshot, orderBy, query, where, doc, getDoc, serverTimestamp } from 'firebase/firestore';

export default function TherapistMessages() {
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [active, setActive] = useState(null); // {therapistId, patientId, patient}
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');

  // Build thread list from accepted bookings
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) { setLoading(false); return; }
    const q = query(collection(db, 'callRequests'), where('therapistId', '==', uid), where('status', '==', 'accepted'));
    const unsub = onSnapshot(q, async snap => {
      const rows = await Promise.all(snap.docs.map(async d => {
        const data = { id: d.id, ...d.data() };
        if (data.uid) {
          try { const u = await getDoc(doc(db, 'users', data.uid)); if (u.exists()) data.patient = u.data(); } catch {}
        }
        return data;
      }));
      // Deduplicate by patient
      const byPatient = new Map();
      for (const r of rows) {
        const pid = r.uid;
        if (!pid) continue;
        if (!byPatient.has(pid)) byPatient.set(pid, { patientId: pid, patient: r.patient, last: r });
        else {
          const cur = byPatient.get(pid);
          const curTs = cur.last.createdAt?.toDate?.()?.getTime?.() || 0;
          const newTs = r.createdAt?.toDate?.()?.getTime?.() || 0;
          if (newTs > curTs) cur.last = r;
        }
      }
      const list = Array.from(byPatient.values()).sort((a,b) => ((b.last.createdAt?.toDate?.()?.getTime?.()||0) - (a.last.createdAt?.toDate?.()?.getTime?.()||0)));
      setThreads(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (!filter) return threads;
    const f = filter.toLowerCase();
    return threads.filter(t => (t.patient?.fullName||'').toLowerCase().includes(f) || (t.patient?.email||'').toLowerCase().includes(f));
  }, [threads, filter]);

  // Load messages for active chat
  useEffect(() => {
    if (!active?.patientId || !auth.currentUser?.uid) { setMessages([]); return; }
    const chatId = `${auth.currentUser.uid}_${active.patientId}`;
    const q = query(collection(db, 'therapistChats', chatId, 'messages'), orderBy('createdAt', 'asc'));
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data(), ts: d.data().createdAt?.toDate?.() || new Date() })));
    });
    return () => unsub();
  }, [active]);

  const send = async e => {
    e.preventDefault();
    if (!text.trim() || !active?.patientId || !auth.currentUser?.uid) return;
    const chatId = `${auth.currentUser.uid}_${active.patientId}`;
    await addDoc(collection(db, 'therapistChats', chatId, 'messages'), {
      text: text.trim(),
      senderId: auth.currentUser.uid,
      senderType: 'therapist',
      senderName: auth.currentUser.displayName || 'Therapist',
      createdAt: serverTimestamp()
    });
    setText('');
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Messages</h1>
        <p className="text-gray-600">Chat with your patients (accepted bookings)</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Threads */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="mb-3 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
            <FiSearch className="text-gray-400" />
            <input value={filter} onChange={e => setFilter(e.target.value)} className="outline-none flex-1 bg-transparent" placeholder="Search conversations..." />
          </div>
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => (<div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />))}
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto divide-y">
              {filtered.map(t => (
                <button key={t.patientId} onClick={() => setActive(t)} className={`w-full text-left p-3 hover:bg-gray-50 ${active?.patientId===t.patientId?'bg-blue-50':''}`}>
                  <div className="font-medium text-gray-800">{t.patient?.fullName || 'Patient'}</div>
                  <div className="text-xs text-gray-500">{t.patient?.email || ''}</div>
                </button>
              ))}
              {filtered.length === 0 && <div className="text-center text-gray-500 py-8">No conversations</div>}
            </div>
          )}
        </div>

        {/* Chat panel */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col">
          {!active ? (
            <div className="flex-1 flex items-center justify-center text-gray-400"><FiMessageSquare className="mr-2"/> Select a conversation</div>
          ) : (
            <>
              <div className="border-b p-4">
                <div className="font-semibold text-blue-700">Chat with {active.patient?.fullName || 'Patient'}</div>
                <div className="text-xs text-gray-500">
                  {active.patient?.email || ''}
                  {active.patient?.phone && <> • {active.patient.phone}</>}
                  {(active.patient?.age || active.patient?.city) && (
                    <> • {active.patient?.age ? `Age: ${active.patient.age}` : ''}{active.patient?.age && active.patient?.city ? ' • ' : ''}{active.patient?.city || ''}</>
                  )}
                </div>
                {active.patient?.bio && (
                  <div className="mt-1 text-xs text-gray-600 line-clamp-2">{active.patient.bio}</div>
                )}
              </div>
              <div className="flex-1 p-4 space-y-3 overflow-y-auto">
                {messages.map(m => (
                  <div key={m.id} className={`flex ${m.senderType==='therapist'?'justify-end':'justify-start'}`}>
                    <div className={`max-w-[70%] p-3 rounded-lg ${m.senderType==='therapist'?'bg-blue-500 text-white':'bg-gray-100 text-gray-800'}`}>
                      <p className="text-sm">{m.text}</p>
                      <p className={`text-xs mt-1 ${m.senderType==='therapist'?'text-blue-100':'text-gray-500'}`}>{m.ts.toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
              </div>
              <form onSubmit={send} className="border-t p-4 flex gap-2">
                <input value={text} onChange={e=>setText(e.target.value)} className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="Type a message" />
                <button disabled={!text.trim()} className="inline-flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"><FiSend/> Send</button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
