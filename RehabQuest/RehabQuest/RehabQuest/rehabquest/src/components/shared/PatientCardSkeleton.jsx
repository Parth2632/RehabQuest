import React from 'react';

export default function PatientCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 animate-pulse">
      <div className="p-6">
        <div className="flex items-center mb-4">
          <div className="bg-gray-200 rounded-full w-12 h-12 mr-4"></div>
          <div className="w-3/4">
            <div className="h-4 bg-gray-200 rounded w-2/3 mb-2"></div>
            <div className="h-3 bg-gray-100 rounded w-1/3"></div>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="h-3 bg-gray-100 rounded w-4/5"></div>
          <div className="h-3 bg-gray-100 rounded w-3/4"></div>
          <div className="h-3 bg-gray-100 rounded w-2/3"></div>
          <div className="h-3 bg-gray-100 rounded w-3/5"></div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="h-10 bg-gray-200 rounded-lg"></div>
        </div>
      </div>
    </div>
  );
}
