import React, { useState } from "react";
import { motion } from "framer-motion";
import { Brain, Lightbulb, MessageSquare, Save, Trash2, RotateCcw } from "lucide-react";
import { auth, db } from "../../firebase-config.js";
import { addDoc, collection, serverTimestamp, deleteDoc, doc, onSnapshot, query, orderBy } from "firebase/firestore";
import { useMood } from "../../contexts/MoodContext.jsx";
import { getCBTAssistance } from "../../services/ai.js";

export default function ThoughtRecord() {
  const [currentThought, setCurrentThought] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [thoughts, setThoughts] = useState([]);
  const [selectedThought, setSelectedThought] = useState(null);
  const { user } = useMood();

  // Load existing thoughts
  React.useEffect(() => {
    if (!user) return;

    const q = query(collection(db, "users", user.uid, "thoughts"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setThoughts(list);
    });
    return () => unsub();
  }, [user]);

  const handleSaveThought = async () => {
    if (!currentThought.trim() || !user) return;

    try {
      await addDoc(collection(db, "users", user.uid, "thoughts"), {
        thought: currentThought.trim(),
        aiResponse: aiResponse,
        createdAt: serverTimestamp(),
        mood: null // Will be updated with current mood
      });
      
      setCurrentThought("");
      setAiResponse("");
    } catch (error) {
      console.error("Error saving thought:", error);
    }
  };

  const handleDeleteThought = async (thoughtId) => {
    if (!user) return;
    
    try {
      await deleteDoc(doc(db, "users", user.uid, "thoughts", thoughtId));
    } catch (error) {
      console.error("Error deleting thought:", error);
    }
  };

  const getAiAssistance = async () => {
    if (!currentThought.trim()) return;
    
    setIsLoading(true);
    try {
      // Use direct OpenAI integration
      const response = await getCBTAssistance(
        "Current situation or context", // You can add more form fields for this
        currentThought,
        "Feeling anxious/sad/worried", // You can add mood selection
        "Evidence for this thought", // You can add more form fields
        "" // Alternative thought attempt
      );
      
      setAiResponse(response);
    } catch (error) {
      console.error('Error getting AI assistance:', error);
      setAiResponse(`I'm having trouble analyzing this thought right now. ${error.message || 'Please try again later.'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setCurrentThought("");
    setAiResponse("");
    setSelectedThought(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-blue-700 mb-2">Thought Record</h1>
          <p className="text-gray-600">Challenge negative thoughts with AI assistance and CBT techniques</p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What's on your mind? (Negative thought, worry, or concern)
              </label>
              <textarea
                value={currentThought}
                onChange={(e) => setCurrentThought(e.target.value)}
                placeholder="e.g., 'I always mess things up' or 'Nobody likes me'"
                className="w-full p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={4}
              />
            </div>

            <div className="flex gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={getAiAssistance}
                disabled={!currentThought.trim() || isLoading}
                className="flex items-center gap-2 bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <RotateCcw className="animate-spin" size={20} />
                ) : (
                  <Brain size={20} />
                )}
                {isLoading ? "Analyzing..." : "Get AI Assistance"}
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={resetForm}
                className="flex items-center gap-2 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                <RotateCcw size={20} />
                Reset
              </motion.button>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="text-blue-500" size={20} />
                  <span className="font-medium text-blue-700">AI CBT Assistant</span>
                </div>
                <p className="text-gray-700">{aiResponse}</p>
              </div>
            )}

            {/* Save Button */}
            {currentThought.trim() && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSaveThought}
                className="w-full bg-green-500 text-white py-3 rounded-lg hover:bg-green-600 font-medium"
              >
                <Save className="inline mr-2" size={20} />
                Save Thought Record
              </motion.button>
            )}
          </div>
        </div>

        {/* Saved Thoughts */}
        {thoughts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">Your Thought Records</h2>
            <div className="space-y-4">
              {thoughts.map((thought) => (
                <motion.div
                  key={thought.id}
                  whileHover={{ scale: 1.01 }}
                  className="border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="text-sm text-gray-500">
                      {thought.createdAt?.toDate ? 
                        thought.createdAt.toDate().toLocaleDateString() : 
                        new Date(thought.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => handleDeleteThought(thought.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete thought"
                    >
                      <Trash2 size={16} />
                    </motion.button>
                  </div>
                  
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-800 mb-2">Original Thought:</h4>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded">{thought.thought}</p>
                  </div>

                  {thought.aiResponse && (
                    <div>
                      <h4 className="font-medium text-gray-800 mb-2">AI Response:</h4>
                      <p className="text-gray-700 bg-blue-50 p-3 rounded">{thought.aiResponse}</p>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        )}

        {/* CBT Tips */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          <h2 className="text-xl font-semibold text-blue-700 mb-4 flex items-center gap-2">
            <MessageSquare className="text-blue-500" />
            CBT Tips for Challenging Thoughts
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Identify Cognitive Distortions:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• All-or-nothing thinking</li>
                <li>• Overgeneralization</li>
                <li>• Catastrophizing</li>
                <li>• Mind reading</li>
                <li>• Emotional reasoning</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">Challenge Questions:</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• What's the evidence?</li>
                <li>• Is this thought helpful?</li>
                <li>• What would I tell a friend?</li>
                <li>• What's a more balanced view?</li>
                <li>• Am I jumping to conclusions?</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
