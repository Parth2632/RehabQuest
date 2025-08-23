import React, { useState } from 'react';
import OpenAI from 'openai';

const SimpleOpenAITest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testOpenAI = async () => {
    setLoading(true);
    setResult('');

    try {
      // Check API key first
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
      console.log('API Key exists:', !!apiKey);
      console.log('API Key format:', apiKey ? `${apiKey.substring(0, 7)}...` : 'None');
      
      if (!apiKey) {
        throw new Error('No API key found in environment variables');
      }

      if (!apiKey.startsWith('sk-')) {
        throw new Error('Invalid API key format - should start with sk-');
      }

      // Initialize OpenAI client
      const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      console.log('OpenAI client created successfully');

      // Make a simple API call
      const response = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: 'Say "Hello, RehabQuest!" in a friendly way.'
          }
        ],
        max_tokens: 50,
        temperature: 0.7
      });

      const aiResponse = response.choices[0].message.content;
      console.log('OpenAI Response:', aiResponse);
      
      setResult(`✅ SUCCESS: ${aiResponse}`);
    } catch (error) {
      console.error('OpenAI Test Error:', error);
      
      // Provide more specific error information
      let errorMessage = error.message;
      
      if (error.code === 'invalid_api_key') {
        errorMessage = 'Invalid API Key - check that your OpenAI API key is correct';
      } else if (error.code === 'insufficient_quota') {
        errorMessage = 'Insufficient quota - check your OpenAI account balance';
      } else if (error.message?.includes('CORS')) {
        errorMessage = 'CORS error - OpenAI API blocked by browser security';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error - check your internet connection';
      }
      
      setResult(`❌ ERROR: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Simple OpenAI Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
            <div>API Key Present: {import.meta.env.VITE_OPENAI_API_KEY ? '✅ Yes' : '❌ No'}</div>
            <div>API Key Format: {import.meta.env.VITE_OPENAI_API_KEY?.startsWith('sk-') ? '✅ Valid (sk-...)' : '❌ Invalid'}</div>
            <div>Dev Mode: {import.meta.env.DEV ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <button
            onClick={testOpenAI}
            disabled={loading}
            className={`w-full px-6 py-3 rounded-lg font-medium text-white ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? 'Testing OpenAI...' : 'Test OpenAI Connection'}
          </button>
        </div>

        {result && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Result</h2>
            <div className={`p-4 rounded border ${
              result.includes('SUCCESS') 
                ? 'bg-green-50 border-green-200 text-green-700' 
                : 'bg-red-50 border-red-200 text-red-700'
            }`}>
              {result}
            </div>
          </div>
        )}

        <div className="bg-yellow-50 p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-900">Debug Instructions</h2>
          <div className="text-yellow-800 text-sm">
            <p className="mb-2">1. Open browser Developer Tools (F12)</p>
            <p className="mb-2">2. Go to Console tab</p>
            <p className="mb-2">3. Click the test button above</p>
            <p>4. Check for detailed error messages in the console</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleOpenAITest;
