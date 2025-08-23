import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Send, Bot, User, Loader2 } from 'lucide-react';
import { getChatbotResponse } from "../../services/ai.js";
import { useMood } from '../../contexts/MoodContext.jsx';
import { auth, db } from '../../firebase-config.js';
import { addDoc, collection, serverTimestamp, onSnapshot, query, orderBy } from 'firebase/firestore';

export default function AiChatbot() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Hello! I'm your mental health support assistant. I'm here to listen and provide supportive guidance. How are you feeling today?",
      sender: 'bot',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const { user } = useMood();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load conversation history from Firebase
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'users', user.uid, 'chatHistory'), 
      orderBy('createdAt', 'asc')
    );
    
    const unsub = onSnapshot(q, (snapshot) => {
      const loadedMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().createdAt?.toDate() || new Date()
      }));
      
      if (loadedMessages.length > 0) {
        setMessages(prev => [
          prev[0], // Keep welcome message
          ...loadedMessages
        ]);
      }
    });

    return () => unsub();
  }, [user]);

  const saveMessageToFirebase = async (message) => {
    if (!user) return;
    
    try {
      await addDoc(collection(db, 'users', user.uid, 'chatHistory'), {
        text: message.text,
        sender: message.sender,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      text: inputText.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    
    // Save user message to Firebase
    if (user) {
      await saveMessageToFirebase(userMessage);
    }

    setInputText('');
    setIsLoading(true);

    try {
      // Get conversation history for context (last 10 messages)
      const conversationHistory = messages.slice(-10).map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
      }));

      const response = await getChatbotResponse(userMessage.text, conversationHistory);
      
      const botMessage = {
        id: Date.now() + 1,
        text: response,
        sender: 'bot',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, botMessage]);
      
      // Save bot message to Firebase
      if (user) {
        await saveMessageToFirebase(botMessage);
      }
    } catch (error) {
      console.error('Chatbot error:', error);
      const errorMessage = {
        id: Date.now() + 1,
        text: "I'm having trouble responding right now. Please try again in a moment. If you're in crisis, please contact a mental health professional or emergency services.",
        sender: 'bot',
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, errorMessage]);
      
      if (user) {
        await saveMessageToFirebase(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-blue-700 mb-2 flex items-center justify-center gap-2">
            <MessageCircle className="text-blue-500" size={32} />
            AI Mental Health Assistant
          </h1>
          <p className="text-gray-600">
            A supportive AI companion for your mental health journey
          </p>
        </div>

        {/* Chat Container */}
        <div className="bg-white rounded-xl shadow-sm border border-blue-100 overflow-hidden">
          {/* Messages Area */}
          <div className="h-[500px] overflow-y-auto p-4 space-y-4">
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-start gap-3 ${
                  message.sender === 'user' ? 'flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${
                  message.sender === 'user' 
                    ? 'bg-blue-500' 
                    : 'bg-green-500'
                }`}>
                  {message.sender === 'user' ? (
                    <User size={16} />
                  ) : (
                    <Bot size={16} />
                  )}
                </div>

                {/* Message Bubble */}
                <div className={`max-w-[70%] p-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-blue-500 text-white rounded-tr-sm'
                    : 'bg-gray-100 text-gray-800 rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.text}
                  </p>
                  <p className={`text-xs mt-2 ${
                    message.sender === 'user' 
                      ? 'text-blue-100' 
                      : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </p>
                </div>
              </motion.div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Bot size={16} />
                </div>
                <div className="bg-gray-100 p-3 rounded-2xl rounded-tl-sm">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Loader2 className="animate-spin" size={16} />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-blue-100 p-4">
            {!user && (
              <div className="mb-3 text-sm text-amber-600 bg-amber-50 p-2 rounded">
                💡 Sign in to save your conversation history
              </div>
            )}
            
            <form onSubmit={sendMessage} className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type your message here..."
                className="flex-1 p-3 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="bg-blue-500 text-white p-3 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={20} />
              </motion.button>
            </form>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            <strong>Important:</strong> This AI assistant provides supportive guidance but is not a replacement for professional mental health care. 
            If you're experiencing a mental health crisis, please contact a licensed professional or emergency services immediately.
          </p>
          <div className="mt-2 text-sm text-yellow-700">
            <strong>Crisis Resources:</strong>
            <ul className="mt-1 space-y-1">
              <li>• National Suicide Prevention Lifeline: 988</li>
              <li>• Crisis Text Line: Text HOME to 741741</li>
              <li>• International Association for Suicide Prevention: <a href="https://www.iasp.info/resources/Crisis_Centres/" className="underline" target="_blank" rel="noopener noreferrer">Crisis Centers</a></li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
