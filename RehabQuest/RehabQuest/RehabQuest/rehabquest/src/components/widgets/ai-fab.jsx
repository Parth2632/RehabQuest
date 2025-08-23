import React, { useState } from "react";
import { motion } from "framer-motion";
import AIBot from "../patients/ai-bot.jsx";

export default function AIFab() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Chat with AI"
        className="fixed bottom-6 right-6 bg-gradient-to-r from-blue-400 to-blue-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
          <path d="M2 12c0-5.523 4.477-10 10-10s10 4.477 10 10-4.477 10-10 10H7a1 1 0 0 1-1-1v-2a7 7 0 0 1-4-6z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-2xl max-h-[80vh]">
            <div className="bg-white rounded-xl shadow-xl border border-blue-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2 border-b">
                <h3 className="text-blue-700 font-semibold">AI Companion</h3>
                <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
              </div>
              <div className="p-2">
                <AIBot />
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </>
  );
}
