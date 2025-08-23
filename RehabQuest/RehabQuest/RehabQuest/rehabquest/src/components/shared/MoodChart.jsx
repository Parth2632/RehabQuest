import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Label,
  ReferenceLine
} from 'recharts';

const moodData = [
  { date: '2023-01-01', mood: 3 },
  { date: '2023-01-02', mood: 4 },
  { date: '2023-01-03', mood: 2 },
  { date: '2023-01-04', mood: 5 },
  { date: '2023-01-05', mood: 3 },
  { date: '2023-01-06', mood: 4 },
  { date: '2023-01-07', mood: 5 },
];

const moodLevels = {
  1: 'Very Low',
  2: 'Low',
  3: 'Neutral',
  4: 'Good',
  5: 'Very Good'
};

export default function MoodChart({ patientId }) {
  // In a real app, you would fetch this data from your backend
  const [data, setData] = React.useState(moodData);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    const fetchMoodData = async () => {
      try {
        setLoading(true);
        // Replace with actual API call
        // const response = await fetch(`/api/patients/${patientId}/mood`);
        // const result = await response.json();
        // setData(result);
      } catch (err) {
        console.error('Error fetching mood data:', err);
        setError('Failed to load mood data');
      } finally {
        setLoading(false);
      }
    };

    fetchMoodData();
  }, [patientId]);

  if (loading) {
    return <div className="h-64 flex items-center justify-center text-gray-500">Loading mood data...</div>;
  }

  if (error) {
    return <div className="text-red-500 p-4">{error}</div>;
  }

  // Calculate insights
  const averageMood = data.length > 0 
    ? (data.reduce((sum, item) => sum + item.mood, 0) / data.length).toFixed(1)
    : 0;
    
  const moodTrend = data.length > 1 
    ? data[data.length - 1].mood - data[0].mood
    : 0;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Mood Tracker</h3>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                />
                <YAxis 
                  domain={[1, 5]} 
                  ticks={[1, 2, 3, 4, 5]}
                  tickFormatter={(value) => moodLevels[value]}
                />
                <Tooltip 
                  formatter={(value) => [moodLevels[value], 'Mood']}
                  labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                />
                <Line 
                  type="monotone" 
                  dataKey="mood" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                  name="Mood Level"
                />
                <ReferenceLine y={3} stroke="#9ca3af" strokeDasharray="3 3" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        <div className="space-y-4">
          <h4 className="font-medium text-gray-700">Mood Insights</h4>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{averageMood}/5</div>
            <div className="text-sm text-gray-600">Average Mood</div>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-lg font-medium text-green-600">
              {moodTrend > 0 ? '↑ Improving' : moodTrend < 0 ? '↓ Declining' : '→ Stable'}
            </div>
            <div className="text-sm text-gray-600">Mood Trend</div>
          </div>
          
          <div className="bg-yellow-50 p-4 rounded-lg">
            <div className="text-lg font-medium text-yellow-600">
              {data.length} Entries
            </div>
            <div className="text-sm text-gray-600">Total Records</div>
          </div>
          
          <div className="mt-4 text-sm text-gray-600">
            <p className="font-medium mb-1">Mood Scale:</p>
            <ul className="space-y-1">
              {Object.entries(moodLevels).map(([level, label]) => (
                <li key={level} className="flex items-center">
                  <span className="w-4 text-gray-500">{level}.</span>
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
