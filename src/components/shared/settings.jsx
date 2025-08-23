import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase-config.js";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";

export default function Settings() {
  const user = auth.currentUser;
  const [prefs, setPrefs] = useState({ emailUpdates: true, showTips: true });
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      try {
        const snap = await getDoc(doc(db, "users", user.uid, "meta", "settings"));
        if (snap.exists()) setPrefs({ ...prefs, ...snap.data() });
      } catch (_) {}
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setStatus("");
    try {
      await setDoc(doc(db, "users", user.uid, "meta", "settings"), prefs, { merge: true });
      setStatus("Settings saved");
    } catch (err) {
      setStatus("Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center p-6">
        <div className="text-blue-700 font-semibold">Please log in to manage settings.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <h1 className="text-2xl font-bold text-blue-700">Settings</h1>
        <p className="text-gray-600 mt-1">Personalize your experience.</p>

        <form onSubmit={save} className="mt-6 space-y-4">
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={prefs.emailUpdates} onChange={e => setPrefs({ ...prefs, emailUpdates: e.target.checked })} />
            <span className="text-gray-700">Email updates</span>
          </label>
          <label className="flex items-center gap-3">
            <input type="checkbox" checked={prefs.showTips} onChange={e => setPrefs({ ...prefs, showTips: e.target.checked })} />
            <span className="text-gray-700">Show helpful tips</span>
          </label>

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" disabled={saving}
            className="bg-gradient-to-r from-blue-400 to-blue-500 text-white px-5 py-3 rounded-lg shadow-md hover:shadow-lg disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Settings"}
          </motion.button>

          {status && <div className="text-blue-700">{status}</div>}
        </form>
      </div>
    </div>
  );
}
