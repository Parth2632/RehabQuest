import React, { useState } from "react";
import { analytics } from "../../firebase-config.js";
import { motion } from "framer-motion";
import { Smile, Meh, Frown } from "lucide-react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { useMood } from "../../contexts/MoodContext.jsx";

const moods = [
  { score: 1, label: "Very Low", icon: Frown, color: "text-blue-700" },
  { score: 2, label: "Low", icon: Frown, color: "text-blue-700" },
  { score: 3, label: "Okay", icon: Meh, color: "text-blue-700" },
  { score: 4, label: "Good", icon: Smile, color: "text-blue-700" },
  { score: 5, label: "Great", icon: Smile, color: "text-blue-700" },
];

export default function MoodTracker() {
  const [selected, setSelected] = useState(null);
  const { entries, saveMood, getChartData, user } = useMood();

  const chartData = getChartData(7);
  
  const handleSaveMood = async (score) => {
    setSelected(score);
    try { 
      (await import("firebase/analytics")).logEvent(analytics, "save_mood", { score }); 
    } catch (_) {}
    
    await saveMood(score);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100 p-6">
        <h1 className="text-2xl font-bold text-blue-700">Mood Tracker</h1>
        <p className="mt-1 text-gray-600">Track your mood and visualize trends over time.</p>

        {!user && (
          <div className="mt-4 text-blue-700 font-medium">Please log in to save your moods.</div>
        )}

        <div className="mt-6 grid grid-cols-3 gap-4">
          {moods.map((m) => {
            const Icon = m.icon;
            const active = selected === m.score;
            return (
              <motion.button
                key={m.score}
                whileHover={{ scale: 1.05 }} 
                whileTap={{ scale: 0.97 }}
                onClick={() => handleSaveMood(m.score)}
                className={"border border-blue-200 rounded-xl p-6 text-center bg-white hover:shadow-md transition " + (active ? "ring-2 ring-blue-500" : "")}
                disabled={!user}
              >
                <Icon className={"mx-auto " + m.color} size={32} />
                <div className="mt-2 font-semibold text-blue-700">{m.label}</div>
              </motion.button>
            );
          })}
        </div>

        <div className="mt-8">
          <h2 className="text-lg font-semibold text-blue-700 mb-2">Last 7 entries</h2>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="time" stroke="#4B5563" />
                <YAxis domain={[1, 5]} allowDecimals={false} stroke="#4B5563" />
                <Tooltip />
                <Line type="monotone" dataKey="mood" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Current Mood Summary */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-md font-semibold text-blue-700 mb-2">Current Mood Summary</h3>
          <div className="text-center">
            {entries.length > 0 ? (
              <div>
                <div className="text-2xl font-bold text-blue-700">
                  {entries[entries.length - 1].score}/5
                </div>
                <div className="text-sm text-gray-600">
                  Last updated: {entries[entries.length - 1].createdAt?.toDate ? 
                    entries[entries.length - 1].createdAt.toDate().toLocaleDateString() : 
                    new Date(entries[entries.length - 1].createdAt || Date.now()).toLocaleDateString()}
                </div>
              </div>
            ) : (
              <div className="text-gray-600">No mood entries yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
