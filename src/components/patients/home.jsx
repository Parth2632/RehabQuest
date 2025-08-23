import React, { useState } from "react";
import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import AIFab from "../widgets/ai-fab.jsx";
import { useMood } from "../../contexts/MoodContext.jsx";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";





function Home() {
  return (
    <div className="bg-gradient-to-b from-blue-50 to-white min-h-screen text-gray-800">
      {/* Hero Section */}
      <section className="text-center pt-12 px-4">
        <h2 className="text-4xl font-bold text-blue-700 mb-4">
          Welcome to RehabQuest
        </h2>

        <div className="max-w-2xl mx-auto space-y-3 text-lg text-gray-600 leading-relaxed">
          <TypeAnimation
            sequence={[
              "A safe space to track your mood and recovery journey.",
              2000,
              "Play engaging therapeutic games for your mental well-being.",
              2000,
              "Journal your thoughts and connect with supportive therapists.",
              2000,
            ]}
            wrapper="p"
            speed={50}
            repeat={Infinity}
            className="min-h-[3rem]"
          />
        </div>
      </section>

      {/* Action Buttons with Routing */}
      <div className="mt-12 flex flex-wrap gap-6 justify-center">
        <Link to="/mood-tracker">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white text-blue-700 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-blue-100"
          >
            Track My Mood
          </motion.button>
        </Link>

        <Link to="/thought-record">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white text-blue-700 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-blue-100"
          >
            Thought Record
          </motion.button>
        </Link>

        <Link to="/cbt-games">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white text-blue-700 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-blue-100"
          >
            Play CBT Games
          </motion.button>
        </Link>

        <Link to="/journaling">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white text-blue-700 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-blue-100"
          >
            Journaling
          </motion.button>
        </Link>

        <Link to="/community">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            className="bg-white text-blue-700 px-6 py-4 rounded-xl shadow-sm hover:shadow-md transition duration-300 border border-blue-100"
          >
            Community
          </motion.button>
        </Link>
      </div>

      {/* Analytics with filter */}
      <div className="mt-8 px-6 max-w-4xl mx-auto">
        <AnalyticsBox />
      </div>

      {/* Book a Call */}
      <div className="flex justify-center">
        <Link to="/book-call">
          <motion.button
            whileHover={{ scale: 1.05 }}
            className="mt-10 bg-gradient-to-r from-blue-400 to-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold shadow-md hover:shadow-lg transition"
          >
            Book a Call with Your Nearest Therapist
          </motion.button>
        </Link>
      </div>

      <AIFab />

      {/* Footer */}
      <footer className="mt-14 p-4 bg-blue-50 text-gray-600 text-center text-sm border-t border-blue-100">
        <p>&copy; 2025 RehabQuest. All rights reserved.</p>
      </footer>
    </div>
  );
}

function AnalyticsBox() {
  const { user, getChartData, entries } = useMood();
  const [range, setRange] = useState(7); // in days

  const chartData = getChartData(range);
  const hasData = chartData.some(entry => entry.mood !== null);
  const totalEntries = entries.length;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <TrendingUp className="text-blue-500" />
          <h2 className="text-xl font-semibold text-blue-700">Your Mood Progress</h2>
          <span className="text-sm text-gray-500">({totalEntries} total entries)</span>
        </div>
        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          className="px-3 py-2 border border-blue-200 rounded-lg text-sm text-gray-700"
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
        </select>
      </div>

      {/* Current Mood Summary */}
      {entries.length > 0 && (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-gray-600">Current Mood: </span>
              <span className="font-semibold text-blue-700">
                {entries[entries.length - 1].score}/5
              </span>
            </div>
            <div className="text-sm text-gray-500">
              Last updated: {entries[entries.length - 1].createdAt?.toDate ? 
                entries[entries.length - 1].createdAt.toDate().toLocaleDateString() : 
                new Date(entries[entries.length - 1].createdAt || Date.now()).toLocaleDateString()}
            </div>
          </div>
        </div>
      )}

      {!hasData ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No mood data available for the last {range} days.</p>
          <Link to="/mood-tracker" className="mt-3 inline-block bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition">
            Start Tracking Your Mood
          </Link>
        </div>
      ) : (
        <div className="h-64">
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
      )}
    </div>
  );
}



export default Home;
