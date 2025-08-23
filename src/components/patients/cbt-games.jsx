import React, { useMemo, useState, useEffect } from "react";
import { analytics, auth, db } from "../../firebase-config.js";
import { motion } from "framer-motion";
import { Heart, Brain, Timer, BookOpen, Trash2, Plus, Bot, MessageSquare } from "lucide-react";
import { getCBTAssistance, getChatbotResponse } from "../../services/ai.js";
import { 
  addDoc, collection, serverTimestamp, onSnapshot, query, where, orderBy, deleteDoc, doc, getDocs
} from "firebase/firestore";
import { 
  listGratitudes as offlineListGratitudes,
  addGratitude as offlineAddGratitude,
  removeGratitude as offlineRemoveGratitude
} from "../../utils/offline-store.js";

function scoreSentiment(text) {
  const positive = ["good", "great", "hope", "improve", "love", "proud", "calm", "relax", "win", "happy", "joy"];
  const negative = ["bad", "hate", "fail", "anxious", "anxiety", "sad", "angry", "worse", "panic", "cant", "cannot", "terrible", "awful"];
  let score = 0;
  const t = text.toLowerCase();
  positive.forEach(w => { if (t.includes(w)) score += 1; });
  negative.forEach(w => { if (t.includes(w)) score -= 1; });
  return Math.max(-3, Math.min(3, score));
}

function tipsForScore(score) {
  if (score <= -2) return "Try reframing: What evidence supports a kinder interpretation?";
  if (score === -1) return "Notice the thought. Can you add 'right now' or 'maybe'?";
  if (score === 0) return "Balanced! Identify one helpful action you can take today.";
  if (score === 1) return "Nice! Write a gratitude note for something that went okay.";
  return "Great! Reinforce the win: what did you do that helped?";
}

function getAIBotResponse(userInput, context = 'general') {
  const input = userInput.toLowerCase().trim();
  
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(input)) {
    return "Hello! I'm here to help you with cognitive behavioral therapy techniques. How are you feeling today?";
  }
  
  if (/anxi(ous|ety)|worry|worried|stress|panic/.test(input)) {
    return "I understand you're feeling anxious. Let's try the 5-4-3-2-1 grounding technique: Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, and 1 you can taste. This can help bring you back to the present moment.";
  }
  
  if (/(depress|sad|down|low|empty|hopeless)/.test(input)) {
    return "I hear that you're feeling low right now. Remember that feelings are temporary, even though they feel permanent. Can you think of one small activity that usually brings you a tiny bit of comfort?";
  }
  
  if (/(disaster|ruined|terrible|worst|awful|horrible)/.test(input)) {
    return "It sounds like you might be catastrophizing. Let's challenge this: On a scale of 1-10, how likely is the worst-case scenario? What's a more realistic outcome?";
  }
  
  if (/(always|never|everyone|no one|everything|nothing)/.test(input)) {
    return "I notice some all-or-nothing language. Try replacing 'always' with 'sometimes' or 'often', and 'never' with 'rarely' or 'not usually'. This can help create a more balanced perspective.";
  }
  
  if (/(stupid|idiot|failure|worthless|useless|can't do anything)/.test(input)) {
    return "You're being very hard on yourself. Would you talk to a good friend this way? Try speaking to yourself with the same kindness you'd show someone you care about. What evidence do you have that contradicts this harsh self-judgment?";
  }
  
  if (/(breath|breathing|relax|calm)/.test(input)) {
    return "Great idea! Try the 4-7-8 breathing technique: Breathe in for 4 counts, hold for 7, exhale for 8. Repeat 3-4 times. This activates your parasympathetic nervous system and helps you feel calmer.";
  }
  
  if (/(sleep|insomnia|tired|exhausted)/.test(input)) {
    return "Sleep struggles can really impact our mood and thinking. Try creating a wind-down routine 1 hour before bed: dim lights, avoid screens, maybe some gentle stretching or reading. What's one small change you could make to your bedtime routine?";
  }
  
  const supportiveResponses = [
    "Thank you for sharing that with me. It takes courage to talk about difficult feelings. What do you think might help you feel a little better right now?",
    "I hear you. Sometimes just acknowledging what we're going through is an important first step. What thoughts or feelings are strongest for you right now?",
    "That sounds challenging. Remember that you've gotten through difficult times before. What has helped you cope in the past?",
    "Your feelings are valid and understandable. What would be most helpful for you to focus on right now - thoughts, feelings, or actions?"
  ];
  
  return supportiveResponses[Math.floor(Math.random() * supportiveResponses.length)];
}

export default function CBTGames() {
  const [activeGame, setActiveGame] = useState('thought-record');
  const [thought, setThought] = useState("");
  const [reframe, setReframe] = useState("");
  const [isGeneratingReframe, setIsGeneratingReframe] = useState(false);
  const [gratitudeText, setGratitudeText] = useState("");
  const [gratitudes, setGratitudes] = useState([]);
  const [breathingTime, setBreathingTime] = useState(0);
  const [isBreathing, setIsBreathing] = useState(false);
  const [breathPhase, setBreathPhase] = useState('inhale');
  
  const [chatMessages, setChatMessages] = useState([
    { role: 'bot', message: "Hello! I'm your CBT companion. I'm here to help you work through thoughts and feelings using cognitive behavioral therapy techniques. How are you doing today?" }
  ]);
  const [userMessage, setUserMessage] = useState("");
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  
  const score = useMemo(() => scoreSentiment(thought), [thought]);

  useEffect(() => {
    let interval;
    if (isBreathing && breathingTime > 0) {
      interval = setInterval(() => {
        setBreathingTime(prev => {
          if (prev <= 1) {
            setIsBreathing(false);
            setBreathPhase('inhale');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isBreathing, breathingTime]);

  useEffect(() => {
    if (isBreathing) {
      const phaseInterval = setInterval(() => {
        setBreathPhase(prev => {
          if (prev === 'inhale') return 'hold';
          if (prev === 'hold') return 'exhale';
          return 'inhale';
        });
      }, 4000);
      return () => clearInterval(phaseInterval);
    }
  }, [isBreathing]);

  const generateReframe = async () => {
    if (!thought.trim()) return setReframe("");
    
    setIsGeneratingReframe(true);
    try {
      // Use AI to generate professional CBT reframe
      const aiReframe = await getCBTAssistance(
        "General life situation", // situation
        thought, // thoughts
        "Concerned/worried", // feelings
        "User provided thought", // evidence
        "" // alternative thought attempt
      );
      setReframe(aiReframe);
      
      // Log analytics
      try { 
        (await import("firebase/analytics")).logEvent(analytics, "ai_cbt_reframe_generated"); 
      } catch (_) {}
    } catch (error) {
      console.error('AI reframe error:', error);
      // Fallback to simple text replacement if AI fails
      let r = thought
        .replace(/always|never/gi, "sometimes")
        .replace(/cant|cannot/gi, "can try")
        .replace(/fail|failure/gi, "learn")
        .replace(/should/gi, "could");
      setReframe(r + ". I can take one small step and reassess. (Note: AI assistant temporarily unavailable)");
    } finally {
      setIsGeneratingReframe(false);
    }
  };

  useEffect(() => {
    const user = auth.currentUser;
    setGratitudes(offlineListGratitudes(user?.uid));

    if (!user) return;

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    (async () => {
      try {
        const allSnap = await getDocs(collection(db, "users", user.uid, "gratitude"));
        const toDelete = allSnap.docs.filter(d => {
          const ts = d.data().createdAt;
          return ts?.toDate && ts.toDate().getTime() < since.getTime();
        });
        await Promise.all(toDelete.map(dref => deleteDoc(doc(db, "users", user.uid, "gratitude", dref.id))));
      } catch (_) {}
    })();

    try {
      const q = query(
        collection(db, "users", user.uid, "gratitude"),
        orderBy("createdAt", "desc")
      );
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setGratitudes(list.slice(0, 50));
      });
      return () => unsub();
    } catch (_) {
      // stay offline
    }
  }, []);
  
  const addGratitude = async () => {
    const user = auth.currentUser;
    if (!gratitudeText.trim()) return;
    try {
      if (!user) throw new Error('no-user');
      await addDoc(collection(db, "users", user.uid, "gratitude"), {
        text: gratitudeText.trim(),
        createdAt: serverTimestamp()
      });
    } catch (_) {
      const list = offlineAddGratitude(user?.uid, gratitudeText.trim());
      setGratitudes(list);
    }
    setGratitudeText("");
  };
  
  const removeGratitude = async (id) => {
    const user = auth.currentUser;
    try {
      if (!user) throw new Error('no-user');
      await deleteDoc(doc(db, "users", user.uid, "gratitude", id));
    } catch (_) {
      const list = offlineRemoveGratitude(user?.uid, id);
      setGratitudes(list);
    }
  };

  const startBreathing = (minutes) => {
    setBreathingTime(minutes * 60);
    setIsBreathing(true);
    setBreathPhase('inhale');
  };

  const sendMessage = async () => {
    if (!userMessage.trim() || isSendingMessage) return;
    
    const currentUserMessage = userMessage;
    const newMessages = [...chatMessages, { role: 'user', message: currentUserMessage }];
    setChatMessages(newMessages);
    setUserMessage("");
    setIsSendingMessage(true);
    
    try {
      // Use AI to generate professional CBT response
      const aiResponse = await getChatbotResponse(currentUserMessage);
      setChatMessages(prev => [...prev, { role: 'bot', message: aiResponse }]);
      
      // Log analytics
      try { 
        (await import("firebase/analytics")).logEvent(analytics, "ai_cbt_chat_response"); 
      } catch (_) {}
    } catch (error) {
      console.error('AI chat response error:', error);
      // Fallback to rule-based response if AI fails
      const fallbackResponse = getAIBotResponse(currentUserMessage, activeGame) + " (Note: AI assistant temporarily unavailable)";
      setChatMessages(prev => [...prev, { role: 'bot', message: fallbackResponse }]);
    } finally {
      setIsSendingMessage(false);
    }
  };

  const games = [
    { id: 'thought-record', name: 'Thought Record', icon: Brain },
    { id: 'gratitude', name: 'Gratitude Journal', icon: Heart },
    { id: 'breathing', name: 'Breathing Timer', icon: Timer },
    { id: 'affirmations', name: 'Daily Affirmations', icon: BookOpen },
    { id: 'ai-chat', name: 'CBT Assistant', icon: Bot }
  ];

  const renderGame = () => {
    switch (activeGame) {
      case 'thought-record':
        const lower = thought.toLowerCase();
        const distortions = [];
        if (/always|never/.test(lower)) distortions.push("All-or-nothing thinking detected: notice words like always/never.");
        if (/should|must|ought/.test(lower)) distortions.push("'Should' statements: try replacing 'should' with 'could' or 'I prefer'.");
        if (/disaster|ruined|terrible|worst/.test(lower)) distortions.push("Catastrophizing: rate how likely the worst-case actually is.");
        if (/they think|everyone thinks|people think/.test(lower)) distortions.push("Mind-reading: check the evidence for others' thoughts.");
        
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-700 mb-2">Thought Record</h2>
              <p className="text-gray-600">Type a difficult thought and get a suggested reframe with built-in helper.</p>
            </div>
            <textarea
              rows={5}
              placeholder="E.g., I always mess up interviews."
              value={thought}
              onChange={(e) => setThought(e.target.value)}
              className="w-full p-4 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Sentiment score</div>
                <div className="text-xl font-semibold text-blue-700">{score}</div>
              </div>
              <motion.button 
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={generateReframe}
                disabled={isGeneratingReframe}
                className={`px-5 py-3 rounded-lg shadow-md text-white font-medium ${
                  isGeneratingReframe 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-400 to-blue-500 hover:shadow-lg'
                }`}
              >
                {isGeneratingReframe ? (
                  <>
                    <Brain className="inline animate-spin mr-2" size={16} />
                    Thinking...
                  </>
                ) : (
                  'Ask Helper'
                )}
              </motion.button>
            </div>
            {distortions.length > 0 && (
              <div className="border border-purple-100 rounded-lg p-4 bg-purple-50">
                <div className="text-sm text-purple-700 font-semibold">Helper observations</div>
                <ul className="list-disc list-inside text-sm text-gray-700 mt-1 space-y-1">
                  {distortions.map((d,i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
            {reframe && (
              <div className="border border-blue-100 rounded-lg p-4 bg-blue-50">
                <div className="text-sm text-blue-700 font-semibold">Suggested Reframe</div>
                <p className="text-gray-700 mt-1 whitespace-pre-wrap">{reframe}</p>
              </div>
            )}
            <div className="border border-blue-100 rounded-lg p-4">
              <div className="text-sm text-blue-700 font-semibold">Tip</div>
              <p className="text-gray-700 mt-1">{tipsForScore(score)}</p>
            </div>
          </div>
        );

      case 'gratitude':
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-700 mb-2">Gratitude Journal</h2>
              <p className="text-gray-600">Add moments of gratitude. Entries auto-delete after 24 hours.</p>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={gratitudeText}
                onChange={(e) => setGratitudeText(e.target.value)}
                placeholder="I'm grateful for..."
                className="flex-1 px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <motion.button
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={addGratitude}
                className="bg-blue-500 text-white px-4 py-3 rounded-lg flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add
              </motion.button>
            </div>
            {gratitudes.length === 0 ? (
              <p className="text-gray-500">No entries yet. Write your first gratitude above.</p>
            ) : (
              <div className="space-y-2">
                {gratitudes.map(g => (
                  <div key={g.id} className="flex items-center justify-between border border-blue-100 rounded-lg p-3 bg-white">
                    <div className="text-gray-700">
                      {g.text}
                      {g.createdAt?.toDate && (
                        <div className="text-xs text-gray-400">{g.createdAt.toDate().toLocaleString()}</div>
                      )}
                    </div>
                    <button onClick={() => removeGratitude(g.id)} className="text-red-600 hover:text-red-700" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="border border-blue-100 rounded-lg p-4 bg-green-50">
              <div className="text-sm text-green-700 font-semibold">Mindfulness Tip</div>
              <p className="text-gray-700 mt-1">Take a moment to really feel the appreciation for each item. Notice how gratitude affects your mood and energy.</p>
            </div>
          </div>
        );

      case 'breathing':
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-700 mb-2">Breathing Exercise</h2>
              <p className="text-gray-600">Follow the guided breathing pattern to calm your mind.</p>
            </div>
            {!isBreathing ? (
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-gray-600 mb-4">Choose your breathing session duration:</p>
                  <div className="flex gap-3 justify-center">
                    {[1, 3, 5, 10].map(minutes => (
                      <motion.button
                        key={minutes}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => startBreathing(minutes)}
                        className="bg-blue-500 text-white px-4 py-2 rounded-lg"
                      >
                        {minutes} min
                      </motion.button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center space-y-6">
                <div className="text-4xl font-bold text-blue-700">
                  {Math.floor(breathingTime / 60)}:{(breathingTime % 60).toString().padStart(2, '0')}
                </div>
                <motion.div
                  className={`w-32 h-32 mx-auto rounded-full flex items-center justify-center text-white font-semibold text-lg ${
                    breathPhase === 'inhale' ? 'bg-blue-400' :
                    breathPhase === 'hold' ? 'bg-purple-400' : 'bg-green-400'
                  }`}
                  animate={{
                    scale: breathPhase === 'inhale' ? 1.2 : breathPhase === 'hold' ? 1.1 : 0.9
                  }}
                  transition={{ duration: 4, ease: "easeInOut" }}
                >
                  {breathPhase === 'inhale' ? 'Inhale' : breathPhase === 'hold' ? 'Hold' : 'Exhale'}
                </motion.div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setIsBreathing(false);
                    setBreathingTime(0);
                  }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg"
                >
                  Stop
                </motion.button>
              </div>
            )}
          </div>
        );

      case 'affirmations':
        const affirmations = [
          "I am capable of handling whatever comes my way.",
          "I choose to focus on what I can control.",
          "Every challenge is an opportunity to grow.",
          "I deserve kindness, especially from myself.",
          "Progress, not perfection, is my goal.",
          "I am learning and improving every day.",
          "My thoughts do not define me; my actions do.",
          "I have overcome difficulties before, and I can do it again.",
          "I am worthy of love and belonging.",
          "I can choose my response to any situation.",
          "Each day brings new possibilities.",
          "I am resilient and can bounce back from setbacks."
        ];
        
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-700 mb-2">Daily Affirmations</h2>
              <p className="text-gray-600">Read these positive statements and reflect on their meaning for you.</p>
            </div>
            <div className="space-y-3">
              {affirmations.map((affirmation, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="border border-blue-100 rounded-lg p-4 bg-gradient-to-r from-blue-50 to-purple-50"
                >
                  <p className="text-gray-800 text-center font-medium italic">"{affirmation}"</p>
                </motion.div>
              ))}
            </div>
            <div className="border border-blue-100 rounded-lg p-4 bg-yellow-50">
              <div className="text-sm text-yellow-700 font-semibold">Practice Tip</div>
              <p className="text-gray-700 mt-1">Choose one affirmation that resonates with you today. Repeat it throughout the day, especially during challenging moments.</p>
            </div>
          </div>
        );

      case 'ai-chat':
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold text-blue-700 mb-2">CBT Assistant</h2>
              <p className="text-gray-600">Chat with an AI trained in cognitive behavioral therapy techniques.</p>
            </div>
            
            <div className="border border-blue-200 rounded-lg p-4 h-96 overflow-y-auto space-y-3">
              {chatMessages.map((msg, index) => (
                <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user' 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-100 text-gray-800 border border-gray-200'
                  }`}>
                    {msg.role === 'bot' && (
                      <div className="flex items-center gap-2 mb-1">
                        <Bot className="w-4 h-4" />
                        <span className="text-xs font-semibold">CBT Assistant</span>
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex gap-2">
              <input
                type="text"
                value={userMessage}
                onChange={(e) => setUserMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                placeholder="Type your thoughts or feelings..."
                className="flex-1 px-4 py-3 border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <motion.button
                whileHover={{ scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                onClick={sendMessage}
                disabled={isSendingMessage}
                className={`px-4 py-3 rounded-lg flex items-center gap-2 text-white ${
                  isSendingMessage 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-500 hover:bg-blue-600'
                }`}
              >
                {isSendingMessage ? (
                  <>
                    <Bot className="w-4 h-4 animate-spin" /> 
                    Thinking...
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" /> 
                    Send
                  </>
                )}
              </motion.button>
            </div>
          </div>
        );

      default:
        return <div>Select a tool above</div>;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-700">CBT Wellness Tools</h1>
          <p className="text-gray-600 mt-2">Interactive exercises to support your mental health journey</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {games.map(game => {
            const IconComponent = game.icon;
            return (
              <motion.button
                key={game.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveGame(game.id)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  activeGame === game.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300'
                }`}
              >
                <IconComponent className="w-8 h-8 mx-auto mb-2" />
                <div className="text-sm font-medium">{game.name}</div>
              </motion.button>
            );
          })}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-blue-100 p-6">
          {renderGame()}
        </div>
      </div>
    </div>
  );
}
