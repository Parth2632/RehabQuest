import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, User, Heart, Brain, Lightbulb, Send } from "lucide-react";
import { auth, db } from "../../firebase-config.js";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getChatbotResponse } from "../../services/ai.js";

export default function AIBot() {
  const user = auth.currentUser;
  const params = new URLSearchParams(window.location.search);
  const persona = params.get("persona") || "therapist";
  const personaGreeting = persona === "coach"
    ? "Hi! I'm your recovery coach. What small step can we plan today?"
    : persona === "mindful"
    ? "Hello, I'm your mindfulness guide. What feeling is present right now?"
    : persona === "cbt"
    ? "Hello! I'm your CBT therapist. Let's identify and challenge those negative thoughts together. What's on your mind?"
    : "Hi! I'm your therapist AI companion. How can I help today?";
  const [messages, setMessages] = useState([{ role: "assistant", text: personaGreeting }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Get AI response from our OpenAI-powered endpoint
  const getResponse = async (prompt) => {
    const lowerPrompt = prompt.toLowerCase();
    
    // Anxiety responses with CBT techniques
    if (lowerPrompt.includes('anxious') || lowerPrompt.includes('anxiety') || lowerPrompt.includes('worried') || lowerPrompt.includes('panic')) {
      const anxietyResponses = [
        "I understand you're feeling anxious. This is a CBT technique: Rate your anxiety from 1-10. Then ask: What's the evidence this worry will come true? What's the probability? What would be helpful to focus on instead?",
        "Anxiety often involves overestimating threats. Try the 4-7-8 breathing technique: Inhale for 4, hold for 7, exhale for 8. Then challenge the thought: Is this worry helpful? What's a more realistic perspective?",
        "When anxiety strikes, remember: this feeling is temporary. Use the 5-4-3-2-1 grounding technique, then ask: What cognitive distortion might be at play here? Am I catastrophizing or mind-reading?",
        "Anxiety can make us jump to conclusions. Try writing down your worry, then ask: What's the evidence for and against this thought? What would I tell a friend? What's a more balanced view?"
      ];
      return anxietyResponses[Math.floor(Math.random() * anxietyResponses.length)];
    }
    
    // Depression responses with CBT techniques
    if (lowerPrompt.includes('sad') || lowerPrompt.includes('depressed') || lowerPrompt.includes('down') || lowerPrompt.includes('hopeless')) {
      const depressionResponses = [
        "I hear that you're feeling down. This is a CBT technique: Rate your mood from 1-10. Then ask: What's one small thing that might help even a little? What would I tell a friend feeling this way?",
        "Depression can make everything feel heavy. Try the 'behavioral activation' technique: What's one tiny activity that used to bring you joy? Start with just 5 minutes of it.",
        "Sadness is a valid emotion. Use the 'thought record' technique: Write down your negative thought, then ask: What's the evidence for and against this? What's a more balanced perspective?",
        "You matter, and your feelings are valid. Try the 'compassionate self-talk' technique: What would you say to a dear friend in this situation? Can you offer yourself the same kindness?"
      ];
      return depressionResponses[Math.floor(Math.random() * depressionResponses.length)];
    }
    
    // Stress responses
    if (lowerPrompt.includes('stress') || lowerPrompt.includes('overwhelmed') || lowerPrompt.includes('pressure')) {
      const stressResponses = [
        "Stress can feel overwhelming. Try breaking tasks into smaller, manageable pieces. What's one small thing you can accomplish right now?",
        "When stressed, our breathing becomes shallow. Take 3 deep breaths and remind yourself: you don't have to do everything at once.",
        "Stress is your mind's way of saying you care. Try the 'brain dump' technique - write everything on your mind for 10 minutes without editing.",
        "Remember: you can only control what's within your power. Focus on your next right action, not the entire mountain."
      ];
      return stressResponses[Math.floor(Math.random() * stressResponses.length)];
    }
    
    // Sleep issues
    if (lowerPrompt.includes('sleep') || lowerPrompt.includes('tired') || lowerPrompt.includes('insomnia')) {
      const sleepResponses = [
        "Sleep troubles are common. Try the 4-7-8 breathing in bed, or write down 3 things you're grateful for to shift your mind to positive thoughts.",
        "For better sleep, consider putting devices away 1 hour before bed. Your mind needs time to wind down from the day's stimulation.",
        "If you can't sleep, try progressive muscle relaxation or gentle stretching. Avoid checking the time - it often increases anxiety.",
        "Sleep hygiene matters. Keep your bedroom cool, dark, and quiet. Consider a consistent bedtime routine to signal rest to your body."
      ];
      return sleepResponses[Math.floor(Math.random() * sleepResponses.length)];
    }
    
    // Motivation responses  
    if (lowerPrompt.includes('motivation') || lowerPrompt.includes('lazy') || lowerPrompt.includes('procrastinating')) {
      const motivationResponses = [
        "Motivation can be tricky! Try the 2-minute rule: if something takes less than 2 minutes, do it now. Small wins build momentum.",
        "Sometimes we mistake 'lack of motivation' for being overwhelmed. Break your goal into the smallest possible step and start there.",
        "Motivation follows action, not the other way around. Start with just 5 minutes on your task - often you'll find you continue naturally.",
        "Be gentle with yourself. Some days are for rest, some for action. What would feel manageable for you right now?"
      ];
      return motivationResponses[Math.floor(Math.random() * motivationResponses.length)];
    }
    
    // General supportive responses
    const generalResponses = [
      "Thank you for sharing with me. Remember, seeking support is a sign of strength, not weakness. What's one small step you can take today?",
      "I'm here to listen. Sometimes just expressing our thoughts can provide clarity. How are you feeling right now in this moment?",
      "Every small step counts on your wellness journey. What's been helping you feel even a little bit better lately?",
      "You're not alone in this. Consider trying a mindfulness exercise: focus on your breathing for just 30 seconds and notice how you feel.",
      "It's okay to have difficult days. Progress isn't always linear. What would showing yourself compassion look like today?",
      "Mental health is just as important as physical health. Have you been able to do any self-care activities recently?"
    ];
    
    return generalResponses[Math.floor(Math.random() * generalResponses.length)];
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    const prompt = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", text: prompt }]);
    setLoading(true);
    
    try {
      // Get conversation history for context (last 10 messages)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      // Create persona-specific system message
      let personaContext = '';
      switch(persona) {
        case 'coach':
          personaContext = 'You are a supportive recovery coach. Focus on practical steps, motivation, and building healthy habits. Keep responses encouraging and action-oriented.';
          break;
        case 'mindful':
          personaContext = 'You are a mindfulness guide. Focus on present-moment awareness, breathing techniques, and meditation practices. Keep responses calm and centered.';
          break;
        case 'cbt':
          personaContext = 'You are a CBT therapist. Focus on identifying cognitive distortions, challenging negative thoughts, and evidence-based techniques. Be professional but warm.';
          break;
        default:
          personaContext = 'You are a compassionate mental health therapist. Provide supportive, empathetic responses using evidence-based practices.';
      }

      // Use OpenAI chatbot response with persona context
      const reply = await getChatbotResponse(prompt, conversationHistory, personaContext);
      
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
      
      // Save to Firebase
      if (user) {
        try {
          await addDoc(collection(db, "users", user.uid, "aiChats"), { 
            prompt, 
            reply, 
            persona, 
            createdAt: serverTimestamp() 
          });
        } catch (error) {
          console.error('Error saving to Firebase:', error);
        }
      }
    } catch (error) {
      console.error('OpenAI Error:', error);
      // Fallback to rule-based response only if OpenAI fails
      const reply = await getResponse(prompt);
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-blue-100 p-6 flex flex-col h-[75vh]">
        <div className="flex items-center gap-3 mb-2">
          <div className="bg-blue-100 rounded-full p-2">
            <Bot className="w-6 h-6 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-blue-700">Wellness Companion</h1>
        </div>
        <p className="text-gray-600 mt-1">A supportive companion for your mental health journey. Free and always here to listen.</p>
        
        {/* Persona Selector */}
        <div className="flex gap-2 mt-3">
          <motion.button
            onClick={() => window.location.search = '?persona=therapist'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              persona === 'therapist' 
                ? 'bg-blue-500 text-white' 
                : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
            }`}
            whileHover={{ scale: 1.05 }}
          >
            <Brain className="w-3 h-3 inline mr-1" />
            Therapist
          </motion.button>
          <motion.button
            onClick={() => window.location.search = '?persona=coach'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              persona === 'coach' 
                ? 'bg-green-500 text-white' 
                : 'bg-green-100 text-green-600 hover:bg-green-200'
            }`}
            whileHover={{ scale: 1.05 }}
          >
            <Heart className="w-3 h-3 inline mr-1" />
            Coach
          </motion.button>
          <motion.button
            onClick={() => window.location.search = '?persona=mindful'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              persona === 'mindful' 
                ? 'bg-purple-500 text-white' 
                : 'bg-purple-100 text-purple-600 hover:bg-purple-200'
            }`}
            whileHover={{ scale: 1.05 }}
          >
            <Lightbulb className="w-3 h-3 inline mr-1" />
            Mindful
          </motion.button>
          <motion.button
            onClick={() => window.location.search = '?persona=cbt'}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              persona === 'cbt' 
                ? 'bg-orange-500 text-white' 
                : 'bg-orange-100 text-orange-600 hover:bg-orange-200'
            }`}
            whileHover={{ scale: 1.05 }}
          >
            <Brain className="w-3 h-3 inline mr-1" />
            CBT
          </motion.button>
        </div>

        <div ref={containerRef} className="mt-6 flex-1 overflow-auto space-y-3 pr-1">
          {messages.map((m, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-start gap-3 ${m.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                m.role === "user" 
                  ? "bg-blue-500" 
                  : persona === 'coach' 
                    ? "bg-green-500" 
                    : persona === 'mindful' 
                      ? "bg-purple-500" 
                      : persona === 'cbt'
                        ? "bg-orange-500"
                        : "bg-blue-500"
              }`}>
                {m.role === "user" ? (
                  <User className="w-4 h-4 text-white" />
                ) : (
                  <Bot className="w-4 h-4 text-white" />
                )}
              </div>
              <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                m.role === "user" 
                  ? "bg-blue-500 text-white" 
                  : "bg-gray-100 text-gray-800"
              }`}>
                <div className="text-sm leading-relaxed">{m.text}</div>
              </div>
            </motion.div>
          ))}
          {loading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-3"
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                persona === 'coach' 
                  ? "bg-green-500" 
                  : persona === 'mindful' 
                    ? "bg-purple-500" 
                    : persona === 'cbt'
                      ? "bg-orange-500"
                      : "bg-blue-500"
              }`}>
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl max-w-[80%]">
                <div className="flex items-center gap-1 text-gray-600">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.4s'}}></div>
                  </div>
                  <span className="text-sm ml-2">Thinking...</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <form onSubmit={send} className="mt-4 flex gap-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your message…"
            className="flex-1 px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <motion.button 
            whileHover={{ scale: 1.02 }} 
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={loading}
            className={`px-5 py-3 rounded-lg shadow-md hover:shadow-lg text-white font-medium transition-all disabled:opacity-50 ${
              persona === 'coach' 
                ? 'bg-gradient-to-r from-green-400 to-green-500 hover:from-green-500 hover:to-green-600' 
                : persona === 'mindful' 
                  ? 'bg-gradient-to-r from-purple-400 to-purple-500 hover:from-purple-500 hover:to-purple-600' 
                  : persona === 'cbt'
                    ? 'bg-gradient-to-r from-orange-400 to-orange-500 hover:from-orange-500 hover:to-orange-600'
                    : 'bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600'
            }`}
          >
            <Send className="w-4 h-4" />
          </motion.button>
        </form>
      </div>
    </div>
  );
}
