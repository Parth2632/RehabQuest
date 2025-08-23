// Unified AI service that automatically chooses between OpenAI and Gemini
import * as OpenAIService from './openai.js';
import * as GeminiService from './gemini.js';

// Check which AI service is available
const getAvailableAIService = () => {
  const hasGemini = import.meta.env.VITE_GEMINI_API_KEY && 
                   import.meta.env.VITE_GEMINI_API_KEY !== 'your-gemini-api-key-here';
  
  const hasOpenAI = import.meta.env.VITE_OPENAI_API_KEY && 
                   import.meta.env.VITE_OPENAI_API_KEY.startsWith('sk-');

  // Prefer Gemini (free) over OpenAI (paid)
  if (hasGemini) {
    console.log('🤖 Using Gemini AI (Free)');
    return 'gemini';
  } else if (hasOpenAI) {
    console.log('🤖 Using OpenAI (Paid)');
    return 'openai';
  } else {
    console.error('❌ No AI service configured');
    return null;
  }
};

// CBT Thought Record Assistant
export const getCBTAssistance = async (situation, thoughts, feelings, evidence, alternativeThought = '') => {
  const service = getAvailableAIService();
  
  if (service === 'gemini') {
    return await GeminiService.getCBTAssistance(situation, thoughts, feelings, evidence, alternativeThought);
  } else if (service === 'openai') {
    return await OpenAIService.getCBTAssistance(situation, thoughts, feelings, evidence, alternativeThought);
  } else {
    throw new Error('No AI service is configured. Please set up either Gemini (free) or OpenAI API key.');
  }
};

// AI Chatbot for General Mental Health Support
export const getChatbotResponse = async (userMessage, conversationHistory = [], personaContext = '') => {
  const service = getAvailableAIService();
  
  if (service === 'gemini') {
    return await GeminiService.getChatbotResponse(userMessage, conversationHistory, personaContext);
  } else if (service === 'openai') {
    return await OpenAIService.getChatbotResponse(userMessage, conversationHistory, personaContext);
  } else {
    throw new Error('No AI service is configured. Please set up either Gemini (free) or OpenAI API key.');
  }
};

// Therapist Insight Analysis
export const getPatientInsights = async (patientData) => {
  const service = getAvailableAIService();
  
  if (service === 'gemini') {
    return await GeminiService.getPatientInsights(patientData);
  } else if (service === 'openai') {
    return await OpenAIService.getPatientInsights(patientData);
  } else {
    throw new Error('No AI service is configured. Please set up either Gemini (free) or OpenAI API key.');
  }
};

// Get current AI service info
export const getAIServiceInfo = () => {
  const service = getAvailableAIService();
  return {
    provider: service,
    isConfigured: service !== null,
    isFree: service === 'gemini'
  };
};
