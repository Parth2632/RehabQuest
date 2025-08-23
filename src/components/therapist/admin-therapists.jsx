import React, { useEffect, useMemo, useState } from 'react';
import { auth, db } from '../../firebase-config.js';
import { collection, query, where, onSnapshot, orderBy, updateDoc, doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Shield, Search, Clock } from 'lucide-react';

// Simple admin gate: therapists with userType='therapist' can access this
const checkIsAdmin = async (user) => {
  if (!user) return false;
  try {
    const { doc, getDoc } = await import('firebase/firestore');
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.userType === 'therapist'; // Allow all therapists to manage other therapists
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
  }
  return false;
};

export default function AdminTherapists() {
  const user = auth.currentUser;
  const [therapists, setTherapists] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Check admin status
  useEffect(() => {
    if (user) {
      checkIsAdmin(user).then(result => {
        setIsAdmin(result);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [user]);

// Load patient requests for this therapist (real-time)
useEffect(() => {
  if (!auth.currentUser?.uid) return;
  const q = query(
    collection(db, 'callRequests'),
    where('therapistId', '==', auth.currentUser.uid),
    orderBy('createdAt', 'desc')
  );
  const unsub = onSnapshot(q, async (snap) => {
    const rows = await Promise.all(snap.docs.map(async (d) => {
      const data = { id: d.id, ...d.data() };
      // fetch patient doc
      if (data.uid) {
        try {
          const u = await getDoc(doc(db, 'users', data.uid));
          if (u.exists()) {
            const ud = u.data();
            if (ud.userType === 'patient') {
              data.patient = ud;
            } else {
              return null; // exclude non-patients
            }
          }
        } catch (e) {
          console.warn('patient load failed', e);
        }
      }
      return data;
    }));

    const items = rows.filter(Boolean);
    setTherapists(items);
  });
  return unsub;
}, []);

const list = useMemo(() => {
  return therapists
    .filter(r => {
      const status = r.status || 'requested';
      if (filter === 'all') return true;
      if (filter === 'pending') return status === 'requested';
      if (filter === 'approved') return status === 'accepted';
      if (filter === 'rejected') return status === 'declined';
      return true;
    })
    .filter(r => (r.patient?.fullName || '').toLowerCase().includes(search.toLowerCase()) || (r.patient?.email || '').toLowerCase().includes(search.toLowerCase()));
}, [therapists, filter, search]);

const setStatus = async (id, status) => {
  await updateDoc(doc(db, 'callRequests', id), {
    status
  });
};

  if (!user) {
    return <div className="min-h-screen flex items-center justify-center p-6">Please log in.</div>;
  }
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <Shield className="mx-auto mb-2 text-yellow-600" />
          You don't have admin access.
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-5xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <div className="flex items-center justify-between mb-4">
<h1 className="text-2xl font-bold text-blue-700">Patient Requests</h1>
          <div className="flex gap-2">
            <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border border-blue-200 rounded-lg text-sm">
              <option value="pending">Pending</option>
              <option value="approved">Accepted</option>
              <option value="rejected">Declined</option>
              <option value="all">All</option>
            </select>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-3 text-gray-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search patient name/email" className="pl-8 pr-3 py-2 border border-blue-200 rounded-lg text-sm" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {list.map(r => {
            const name = r.patient?.fullName || 'Patient';
            const email = r.patient?.email || '—';
            const reason = r.topic || r.reason || '—';
            const time = r.time ? new Date(r.time).toLocaleString() : 'No time set';
            const status = r.status || 'requested';
            return (
              <div key={r.id} className={`p-4 rounded-lg border ${status==='requested'?'border-yellow-200 bg-yellow-50': status==='accepted'?'border-green-200 bg-green-50':'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-blue-700 font-semibold">{name}</div>
                    <div className="text-sm text-gray-600">{email}</div>
                    <div className="text-sm text-gray-600 mt-1">Reason: {reason}</div>
                    <div className="text-xs text-gray-500 mt-1"><Clock className="inline w-3 h-3 mr-1" /> {time}</div>
                  </div>
                  <div className="flex gap-2">
                    {status==='requested' ? (
                      <>
                        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={() => setStatus(r.id,'accepted')} className="px-3 py-2 bg-green-600 text-white rounded-lg flex items-center gap-1">
                          <CheckCircle size={16} /> Accept Patient
                        </motion.button>
                        <motion.button whileHover={{scale:1.05}} whileTap={{scale:0.95}} onClick={() => setStatus(r.id,'declined')} className="px-3 py-2 bg-red-100 text-red-700 rounded-lg flex items-center gap-1">
                          <XCircle size={16} /> Reject
                        </motion.button>
                      </>
                    ) : (
                      <span className={`px-2 py-1 rounded-full text-xs ${status==='accepted'?'bg-green-100 text-green-700': status==='declined'?'bg-red-100 text-red-700':'bg-yellow-100 text-yellow-700'}`}>{status}</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {list.length === 0 && (
            <div className="text-center text-gray-500 py-8">No patient requests match the filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
