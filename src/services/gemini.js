import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini with error handling
let genAI;
let model;

try {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (apiKey && apiKey !== 'your-gemini-api-key-here') {
    genAI = new GoogleGenerativeAI(apiKey);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  }
} catch (error) {
  console.error('Gemini initialization error:', error);
}

// Retry function for handling overloaded servers
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (error.message?.includes('overloaded') && attempt < maxRetries - 1) {
        const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
        console.log(`Gemini overloaded, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
};

// Check if Gemini is available
const isGeminiAvailable = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  return model && apiKey && apiKey !== 'your-gemini-api-key-here';
};

// CBT Thought Record Assistant
export const getCBTAssistance = async (situation, thoughts, feelings, evidence, alternativeThought = '') => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini service is not properly configured. Please check your API key.');
  }
  
  try {
    const prompt = `You are a professional CBT (Cognitive Behavioral Therapy) assistant. Help analyze and reframe negative thinking patterns.

SITUATION: ${situation}
AUTOMATIC THOUGHTS: ${thoughts}
FEELINGS: ${feelings}
EVIDENCE FOR THOUGHTS: ${evidence}
${alternativeThought ? `ALTERNATIVE THOUGHT ATTEMPT: ${alternativeThought}` : ''}

Please provide:
1. A balanced perspective on the situation
2. Alternative, more balanced thoughts
3. Evidence against the negative thoughts
4. Coping strategies
5. A supportive, encouraging message

Keep your response supportive, professional, and focused on CBT principles.`;

    return await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('Gemini CBT Assistant Error:', error);
    throw new Error('Unable to get CBT assistance at this time. Please try again.');
  }
};

// AI Chatbot for General Mental Health Support
export const getChatbotResponse = async (userMessage, conversationHistory = [], personaContext = '') => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini service is not properly configured. Please check your API key.');
  }
  
  try {
    const baseContext = `You are a compassionate mental health support chatbot for RehabQuest app. 

GUIDELINES:
- Provide supportive, empathetic responses
- Use evidence-based mental health principles
- Encourage professional help when needed
- Be warm but maintain boundaries
- Suggest coping strategies when appropriate
- Never provide medical diagnoses or prescriptions
- If someone mentions self-harm or suicide, encourage immediate professional help

Keep responses concise but meaningful (2-3 sentences typically).`;

    const contextWithPersona = personaContext 
      ? `${baseContext}\n\nSPECIFIC PERSONA: ${personaContext}` 
      : baseContext;

    // Build conversation context
    const conversationContext = conversationHistory
      .slice(-5) // Keep last 5 messages for context
      .map(msg => `${msg.role}: ${msg.text}`)
      .join('\n');

    const fullPrompt = `${contextWithPersona}

Previous conversation:
${conversationContext}

User: ${userMessage}

Please respond as the supportive mental health assistant:`;

    return await retryWithBackoff(async () => {
      const result = await model.generateContent(fullPrompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('Gemini Chatbot Error:', error);
    throw new Error('Unable to respond at this time. Please try again.');
  }
};

// Therapist Insight Analysis
export const getPatientInsights = async (patientData) => {
  if (!isGeminiAvailable()) {
    throw new Error('Gemini service is not properly configured. Please check your API key.');
  }
  
  try {
    const { moodData, journalEntries, thoughtRecords, demographics } = patientData;
    
    const prompt = `Analyze this patient data and provide professional insights:

DEMOGRAPHICS: ${demographics}
MOOD TRENDS (last 30 days): ${JSON.stringify(moodData)}
RECENT JOURNAL ENTRIES: ${journalEntries.slice(0, 5).join('\n')}
THOUGHT RECORDS: ${thoughtRecords.length} total records

Provide:
1. Overall mental health trends
2. Key areas of concern
3. Positive patterns/progress
4. Recommended focus areas
5. Risk assessment (low/medium/high)

Be professional and clinical in your analysis.`;

    return await retryWithBackoff(async () => {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    });
  } catch (error) {
    console.error('Gemini Patient Insights Error:', error);
    throw new Error('Unable to generate patient insights at this time.');
  }
};
