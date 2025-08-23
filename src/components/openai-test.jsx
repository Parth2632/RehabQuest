import React, { useState } from 'react';
import { testOpenAIConnection, checkOpenAIConfiguration } from '../utils/diagnostics';

const OpenAITest = () => {
  const [testResults, setTestResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    setTestResults(null);
    
    console.log('Running comprehensive OpenAI test...');
    
    // Check configuration first
    try {
      await checkOpenAIConfiguration();
    } catch (error) {
      console.error('Configuration check failed:', error);
    }
    
    // Test connection
    const result = await testOpenAIConnection();
    setTestResults(result);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">OpenAI Integration Test</h1>
        
        {/* Configuration Info */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <div className="space-y-2 text-sm font-mono">
            <div>API Key Present: {import.meta.env.VITE_OPENAI_API_KEY ? '✅ Yes' : '❌ No'}</div>
            <div>API Key Valid Format: {import.meta.env.VITE_OPENAI_API_KEY?.startsWith('sk-') ? '✅ Yes' : '❌ No'}</div>
            <div>Environment: {import.meta.env.MODE}</div>
            <div>Dev Mode: {import.meta.env.DEV ? 'Yes' : 'No'}</div>
          </div>
        </div>

        {/* Test Button */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <button
            onClick={runTest}
            disabled={isLoading}
            className={`px-6 py-3 rounded-lg font-medium text-white ${
              isLoading 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isLoading ? 'Testing Connection...' : 'Test OpenAI Connection'}
          </button>
        </div>

        {/* Test Results */}
        {testResults && (
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold mb-4">Test Results</h2>
            {testResults.success ? (
              <div className="space-y-4">
                <div className="flex items-center text-green-600">
                  <span className="text-2xl mr-2">✅</span>
                  <span className="font-medium">Connection Successful!</span>
                </div>
                <div className="bg-green-50 p-4 rounded border">
                  <h3 className="font-medium text-green-800 mb-2">AI Response:</h3>
                  <p className="text-green-700">{testResults.response}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center text-red-600">
                  <span className="text-2xl mr-2">❌</span>
                  <span className="font-medium">Connection Failed</span>
                </div>
                <div className="bg-red-50 p-4 rounded border">
                  <h3 className="font-medium text-red-800 mb-2">Error:</h3>
                  <p className="text-red-700 font-mono text-sm">{testResults.error}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-900">Troubleshooting Instructions</h2>
          <div className="space-y-3 text-blue-800">
            <div>1. Check that your <code className="bg-blue-100 px-1 rounded">.env</code> file contains <code className="bg-blue-100 px-1 rounded">VITE_OPENAI_API_KEY=sk-...</code></div>
            <div>2. Ensure your API key starts with 'sk-' and is valid</div>
            <div>3. Check the browser console for additional error details</div>
            <div>4. Verify that the <code className="bg-blue-100 px-1 rounded">openai</code> package is installed</div>
            <div>5. Make sure you have sufficient credits on your OpenAI account</div>
          </div>
        </div>

        {/* Console Instructions */}
        <div className="bg-yellow-50 p-6 rounded-lg shadow-md mt-6">
          <h2 className="text-xl font-semibold mb-4 text-yellow-900">Console Debugging</h2>
          <div className="space-y-2 text-yellow-800">
            <p>Open your browser's developer console (F12) to see detailed diagnostic information.</p>
            <p>Look for OpenAI-related logs, network requests, and error messages.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OpenAITest;
