import React, { useEffect, useMemo, useState } from 'react';
import { FiDownload } from 'react-icons/fi';
import { auth, db } from '../../firebase-config.js';
import { collection, onSnapshot, query, where } from 'firebase/firestore';

export default function TherapistReports() {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    const q = query(collection(db, 'callRequests'), where('therapistId', '==', uid));
    const unsub = onSnapshot(q, snap => {
      setRows(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const exportCsv = () => {
    const header = ['id','patientUid','topic','city','time','status','createdAt'];
    const lines = [header.join(',')];
    for (const r of rows) {
      const line = [
        r.id,
        r.uid || '',
        escapeCsv(r.topic || ''),
        escapeCsv(r.city || ''),
        r.time || '',
        r.status || 'requested',
        r.createdAt?.toDate?.()?.toISOString?.() || ''
      ].join(',');
      lines.push(line);
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'therapist_reports.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
          <p className="text-gray-600">Export your booking data</p>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <FiDownload /> Export CSV
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left border-b">
                <th className="py-2 pr-4">Patient</th>
                <th className="py-2 pr-4">Topic</th>
                <th className="py-2 pr-4">City</th>
                <th className="py-2 pr-4">Time</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2 pr-4">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b hover:bg-gray-50">
                  <td className="py-2 pr-4">{r.uid || '—'}</td>
                  <td className="py-2 pr-4">{r.topic || '—'}</td>
                  <td className="py-2 pr-4">{r.city || '—'}</td>
                  <td className="py-2 pr-4">{r.time ? new Date(r.time).toLocaleString() : '—'}</td>
                  <td className="py-2 pr-4">{r.status || 'requested'}</td>
                  <td className="py-2 pr-4">{r.createdAt?.toDate?.()?.toLocaleString?.() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function escapeCsv(s) {
  const needsQuotes = /[",\n]/.test(s);
  const esc = s.replace(/"/g, '""');
  return needsQuotes ? `"${esc}"` : esc;
}
