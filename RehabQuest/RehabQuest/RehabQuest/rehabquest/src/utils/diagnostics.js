// Diagnostic utilities for OpenAI integration
export const checkOpenAIConfiguration = async () => {
  console.log('=== OpenAI Configuration Diagnostics ===');
  
  // Check environment variable
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
  console.log('API Key present:', !!apiKey);
  console.log('API Key format valid:', apiKey ? apiKey.startsWith('sk-') : false);
  console.log('API Key length:', apiKey ? apiKey.length : 0);
  
  // Check OpenAI package
  try {
    const OpenAI = (await import('openai')).default;
    console.log('OpenAI package available:', !!OpenAI);
  } catch (error) {
    console.log('OpenAI package error:', error.message);
  }
  
  // Check environment
  console.log('Environment mode:', import.meta.env.MODE);
  console.log('Base URL:', import.meta.env.BASE_URL);
  console.log('Development mode:', import.meta.env.DEV);
  
  console.log('=== End Diagnostics ===');
};

export const testOpenAIConnection = async () => {
  console.log('=== Testing OpenAI Connection ===');
  
  try {
    const { getChatbotResponse } = await import('../services/openai.js');
    const testMessage = "Hello, this is a test message.";
    console.log('Sending test message:', testMessage);
    
    const response = await getChatbotResponse(testMessage);
    console.log('✅ OpenAI connection successful!');
    console.log('Response:', response);
    return { success: true, response };
  } catch (error) {
    console.error('❌ OpenAI connection failed:', error);
    return { success: false, error: error.message };
  }
};

export const logNetworkRequests = () => {
  // Override fetch to log OpenAI requests
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('openai.com')) {
      console.log('🌐 OpenAI API Request:', url);
      console.log('Request details:', args[1]);
    }
    return originalFetch.apply(this, args)
      .then(response => {
        if (typeof url === 'string' && url.includes('openai.com')) {
          console.log('📥 OpenAI API Response:', response.status, response.statusText);
        }
        return response;
      })
      .catch(error => {
        if (typeof url === 'string' && url.includes('openai.com')) {
          console.error('❌ OpenAI API Error:', error);
        }
        throw error;
      });
  };
};
