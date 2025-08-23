// Firebase Vertex AI (Gemini) integration
import { getFunctions, httpsCallable } from 'firebase/functions';
import { getApp } from 'firebase/app';

// Initialize Firebase Functions
const functions = getFunctions(getApp());

// Create callable functions
const callGemini = httpsCallable(functions, 'callGemini');
const callGeminiCBT = httpsCallable(functions, 'callGeminiCBT');
const callGeminiInsights = httpsCallable(functions, 'callGeminiInsights');

// Check if Firebase AI is available
const isFirebaseAIAvailable = () => {
  try {
    return !!functions;
  } catch (error) {
    console.error('Firebase Functions not available:', error);
    return false;
  }
};

// CBT Thought Record Assistant
export const getCBTAssistance = async (situation, thoughts, feelings, evidence, alternativeThought = '') => {
  if (!isFirebaseAIAvailable()) {
    throw new Error('Firebase AI service is not available. Please check your Firebase configuration.');
  }
  
  try {
    const result = await callGeminiCBT({
      situation,
      thoughts,
      feelings,
      evidence,
      alternativeThought
    });
    
    return result.data.response;
  } catch (error) {
    console.error('Firebase AI CBT Assistant Error:', error);
    throw new Error('Unable to get CBT assistance at this time. Please try again.');
  }
};

// AI Chatbot for General Mental Health Support
export const getChatbotResponse = async (userMessage, conversationHistory = [], personaContext = '') => {
  if (!isFirebaseAIAvailable()) {
    throw new Error('Firebase AI service is not available. Please check your Firebase configuration.');
  }
  
  try {
    const result = await callGemini({
      message: userMessage,
      history: conversationHistory.slice(-5), // Keep last 5 messages
      persona: personaContext,
      type: 'chatbot'
    });
    
    return result.data.response;
  } catch (error) {
    console.error('Firebase AI Chatbot Error:', error);
    throw new Error('Unable to respond at this time. Please try again.');
  }
};

// Therapist Insight Analysis
export const getPatientInsights = async (patientData) => {
  if (!isFirebaseAIAvailable()) {
    throw new Error('Firebase AI service is not available. Please check your Firebase configuration.');
  }
  
  try {
    const result = await callGeminiInsights({
      patientData
    });
    
    return result.data.response;
  } catch (error) {
    console.error('Firebase AI Patient Insights Error:', error);
    throw new Error('Unable to generate patient insights at this time.');
  }
};

// Test connection
export const testFirebaseAI = async () => {
  try {
    const result = await callGemini({
      message: "Hello, this is a test message for RehabQuest app.",
      type: 'test'
    });
    
    return {
      success: true,
      response: result.data.response
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
};
