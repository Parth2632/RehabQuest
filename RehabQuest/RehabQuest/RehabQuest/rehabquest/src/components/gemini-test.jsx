import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { getAIServiceInfo } from '../services/ai.js';

const GeminiTest = () => {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const aiInfo = getAIServiceInfo();

  const testGemini = async () => {
    setLoading(true);
    setResult('');

    try {
      // Check API key first
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      console.log('Gemini API Key exists:', !!apiKey);
      console.log('Gemini API Key format:', apiKey ? `${apiKey.substring(0, 10)}...` : 'None');
      
      if (!apiKey || apiKey === 'your-gemini-api-key-here') {
        throw new Error('No Gemini API key found. Please get one from Google AI Studio.');
      }

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      console.log('Gemini client created successfully');

      // Make a simple API call
      const prompt = "Say 'Hello, RehabQuest!' in a friendly and supportive way for a mental health app.";
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      console.log('Gemini Response:', text);
      
      setResult(`✅ SUCCESS: ${text}`);
    } catch (error) {
      console.error('Gemini Test Error:', error);
      
      // Provide more specific error information
      let errorMessage = error.message;
      
      if (error.message?.includes('API_KEY_INVALID')) {
        errorMessage = 'Invalid API Key - check that your Gemini API key is correct';
      } else if (error.message?.includes('PERMISSION_DENIED')) {
        errorMessage = 'Permission denied - check that your API key has the right permissions';
      } else if (error.message?.includes('QUOTA_EXCEEDED')) {
        errorMessage = 'Quota exceeded - check your Gemini API quota';
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
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Gemini AI Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Current AI Service</h2>
          <div className="space-y-2 text-sm bg-gray-50 p-4 rounded">
            <div>Provider: <span className="font-bold text-blue-600">{aiInfo.provider || 'None'}</span></div>
            <div>Configured: {aiInfo.isConfigured ? '✅ Yes' : '❌ No'}</div>
            <div>Free: {aiInfo.isFree ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Environment Check</h2>
          <div className="space-y-2 text-sm font-mono bg-gray-50 p-4 rounded">
            <div>Gemini API Key Present: {import.meta.env.VITE_GEMINI_API_KEY && import.meta.env.VITE_GEMINI_API_KEY !== 'your-gemini-api-key-here' ? '✅ Yes' : '❌ No'}</div>
            <div>OpenAI API Key Present: {import.meta.env.VITE_OPENAI_API_KEY ? '✅ Yes' : '❌ No'}</div>
            <div>Dev Mode: {import.meta.env.DEV ? '✅ Yes' : '❌ No'}</div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <button
            onClick={testGemini}
            disabled={loading}
            className={`w-full px-6 py-3 rounded-lg font-medium text-white ${
              loading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-green-600 hover:bg-green-700'
            }`}
          >
            {loading ? 'Testing Gemini...' : 'Test Gemini AI'}
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

        <div className="bg-blue-50 p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">How to Get Gemini API Key (Free)</h2>
          <div className="text-blue-800 text-sm space-y-2">
            <p>1. Go to <a href="https://makersuite.google.com/app/apikey" className="underline" target="_blank" rel="noopener noreferrer">Google AI Studio</a></p>
            <p>2. Sign in with your Google account</p>
            <p>3. Click "Create API Key"</p>
            <p>4. Copy the key and add it to your .env file:</p>
            <code className="block bg-blue-100 p-2 rounded mt-2">VITE_GEMINI_API_KEY=your-api-key-here</code>
            <p className="mt-2">5. Restart your dev server</p>
          </div>
        </div>

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

export default GeminiTest;
