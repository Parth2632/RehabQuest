import React, { useEffect, useState } from "react";
import { auth, db, analytics } from "../../firebase-config.js";
import { addDoc, collection, onSnapshot, orderBy, query, serverTimestamp, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { Trash2, Edit, Save, X } from "lucide-react";

export default function Journaling() {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Listen to journal entries
  useEffect(() => {
    if (!user) {
      setEntries([]);
      return;
    }

    const q = query(
      collection(db, "users", user.uid, "journal"), 
      orderBy("createdAt", "desc")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const entriesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      setEntries(entriesData);
    }, (error) => {
      console.error("Error fetching entries:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const saveEntry = async (e) => {
    e.preventDefault();
    if (!user || !text.trim()) return;
    
    try {
      await addDoc(collection(db, "users", user.uid, "journal"), {
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText("");
      
      // Analytics logging with error handling
      if (analytics) {
        try {
          const { logEvent } = await import("firebase/analytics");
          logEvent(analytics, "save_journal");
        } catch (analyticsError) {
          console.warn("Analytics logging failed:", analyticsError);
        }
      }
    } catch (error) {
      console.error("Error saving entry:", error);
      alert("Failed to save entry. Please try again.");
    }
  };

  const deleteEntry = async (entryId) => {
    if (!user) return;
    
    const confirmDelete = window.confirm("Are you sure you want to delete this entry?");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid, "journal", entryId));
    } catch (error) {
      console.error("Error deleting entry:", error);
      alert("Failed to delete entry. Please try again.");
    }
  };

  const startEditing = (entry) => {
    setEditingId(entry.id);
    setEditText(entry.text);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditText("");
  };

  const saveEdit = async (entryId) => {
    if (!user || !editText.trim()) return;
    
    try {
      // Use updateDoc instead of delete + create for better performance and atomicity
      await updateDoc(doc(db, "users", user.uid, "journal", entryId), {
        text: editText.trim(),
        updatedAt: serverTimestamp(), // Track when it was edited
      });
      
      setEditingId(null);
      setEditText("");
    } catch (error) {
      console.error("Error updating entry:", error);
      alert("Failed to update entry. Please try again.");
    }
  };

  // Handle loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4 flex items-center justify-center">
        <div className="text-blue-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6">
        {/* Writing Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h1 className="text-2xl font-bold text-blue-700">Journaling</h1>
          <p className="text-gray-600 mt-1">Write your thoughts to reflect and grow.</p>

          {!user && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-blue-700 font-medium">Please log in to save your journal entries.</div>
            </div>
          )}

          <form onSubmit={saveEntry} className="mt-4 space-y-3">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={8}
              placeholder={user ? "What's on your mind today?" : "Log in to start journaling..."}
              className="w-full p-4 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
              disabled={!user}
            />
            <motion.button 
              whileHover={user ? { scale: 1.02 } : {}} 
              whileTap={user ? { scale: 0.98 } : {}}
              type="submit"
              className={`px-5 py-3 rounded-lg shadow-md transition-colors ${
                user && text.trim()
                  ? "bg-gradient-to-r from-blue-400 to-blue-500 text-white hover:shadow-lg"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
              disabled={!user || !text.trim()}
            >
              Save Entry
            </motion.button>
          </form>
        </div>

        {/* Entries Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-blue-700">Recent Entries</h2>
          <div className="mt-3 space-y-3 max-h-[500px] overflow-auto pr-1">
            {entries.length === 0 && (
              <p className="text-gray-500 italic">
                {user ? "No entries yet. Start writing your first journal entry!" : "Log in to view your journal entries."}
              </p>
            )}
            
            {entries.map((entry) => (
              <div key={entry.id} className="border border-blue-100 rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                {editingId === entry.id ? (
                  // Edit Mode
                  <div className="space-y-3">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={4}
                      className="w-full p-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                    />
                    <div className="flex gap-2">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => saveEdit(entry.id)}
                        className="flex items-center gap-2 bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-sm transition-colors"
                        disabled={!editText.trim()}
                      >
                        <Save size={16} />
                        Save
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={cancelEditing}
                        className="flex items-center gap-2 bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 text-sm transition-colors"
                      >
                        <X size={16} />
                        Cancel
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <>
                    <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">{entry.text}</div>
                    <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-100">
                      <div className="text-xs text-gray-500">
                        {entry.createdAt?.toDate ? (
                          <>
                            {entry.createdAt.toDate().toLocaleString()}
                            {entry.updatedAt && (
                              <span className="ml-2 italic">(edited)</span>
                            )}
                          </>
                        ) : (
                          "Just now"
                        )}
                      </div>
                      <div className="flex gap-1">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => startEditing(entry)}
                          className="text-blue-500 hover:text-blue-700 p-2 rounded-full hover:bg-blue-50 transition-colors"
                          title="Edit entry"
                        >
                          <Edit size={16} />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => deleteEntry(entry.id)}
                          className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-50 transition-colors"
                          title="Delete entry"
                        >
                          <Trash2 size={16} />
                        </motion.button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
