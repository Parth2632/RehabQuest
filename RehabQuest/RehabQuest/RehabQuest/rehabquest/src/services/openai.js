import OpenAI from 'openai';

// Initialize OpenAI with error handling
let openai;
try {
  openai = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true
  });
} catch (error) {
  console.error('OpenAI initialization error:', error);
}

// Check if OpenAI is available
const isOpenAIAvailable = () => {
  return openai && import.meta.env.VITE_OPENAI_API_KEY && import.meta.env.VITE_OPENAI_API_KEY.startsWith('sk-');
};

// CBT Thought Record Assistant
export const getCBTAssistance = async (situation, thoughts, feelings, evidence, alternativeThought = '') => {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI service is not properly configured. Please check your API key.');
  }
  
  try {
    const prompt = `
You are a professional CBT (Cognitive Behavioral Therapy) assistant. Help analyze and reframe negative thinking patterns.

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

Keep your response supportive, professional, and focused on CBT principles.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a supportive CBT therapist assistant. Provide helpful, evidence-based guidance for cognitive restructuring. Be empathetic and professional."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 800,
      temperature: 0.7
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI CBT Assistant Error:', error);
    throw new Error('Unable to get CBT assistance at this time. Please try again.');
  }
};

// AI Chatbot for General Mental Health Support
export const getChatbotResponse = async (userMessage, conversationHistory = [], personaContext = '') => {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI service is not properly configured. Please check your API key.');
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

    const systemContent = personaContext ? `${baseContext}\n\nSPECIFIC PERSONA: ${personaContext}` : baseContext;

    const messages = [
      {
        role: "system",
        content: systemContent
      },
      ...conversationHistory.slice(-10), // Keep last 10 messages for context
      {
        role: "user",
        content: userMessage
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: messages,
      max_tokens: 300,
      temperature: 0.8
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Chatbot Error:', error);
    throw new Error('Unable to respond at this time. Please try again.');
  }
};

// Therapist Insight Analysis
export const getPatientInsights = async (patientData) => {
  if (!isOpenAIAvailable()) {
    throw new Error('OpenAI service is not properly configured. Please check your API key.');
  }
  
  try {
    const { moodData, journalEntries, thoughtRecords, demographics } = patientData;
    
    const prompt = `
Analyze this patient data and provide professional insights:

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

Be professional and clinical in your analysis.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a clinical psychologist providing professional insights about patient data. Be objective, clinical, and helpful to therapists."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: 600,
      temperature: 0.3
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('OpenAI Patient Insights Error:', error);
    throw new Error('Unable to generate patient insights at this time.');
  }
};
