import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../firebase-config';
import { collection, query, where, getDocs, limit, orderBy, startAfter, getCountFromServer } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiChevronLeft, FiChevronRight, FiFilter } from 'react-icons/fi';
import { withErrorBoundary } from './ErrorBoundary';
import PatientCardSkeleton from './PatientCardSkeleton';
import MoodChart from './MoodChart';

const ITEMS_PER_PAGE = 6;

function TherapistPatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    lastActive: 'all',
  });
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    lastVisible: null,
    hasMore: false,
  });
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const fetchPatients = useCallback(async (page = 1, isNewSearch = false) => {
    try {
      setLoading(true);
      setError('');
      
      // Base query
      let q = query(
        collection(db, 'users'),
        where('userType', '==', 'patient'),
        orderBy('fullName'),
        limit(ITEMS_PER_PAGE)
      );

      // Apply search filter
      if (searchTerm) {
        // This is a simplified search - in a real app, you might want to use Algolia or similar
        // for more robust full-text search capabilities
        q = query(
          collection(db, 'users'),
          where('userType', '==', 'patient'),
          orderBy('fullName'),
          startWith(searchTerm),
          endAt(searchTerm + '\uf8ff'),
          limit(ITEMS_PER_PAGE)
        );
      }

      // Apply pagination
      if (page > 1 && pagination.lastVisible) {
        q = query(q, startAfter(pagination.lastVisible));
      }

      // Get total count for pagination
      const countQuery = query(collection(db, 'users'), where('userType', '==', 'patient'));
      const countSnapshot = await getCountFromServer(countQuery);
      const totalItems = countSnapshot.data().count;

      const querySnapshot = await getDocs(q);
      const lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
      
      const patientsData = [];
      querySnapshot.forEach((doc) => {
        patientsData.push({ id: doc.id, ...doc.data() });
      });
      
      setPatients(prev => isNewSearch ? patientsData : [...prev, ...patientsData]);
      
      setPagination(prev => ({
        ...prev,
        currentPage: page,
        totalItems,
        totalPages: Math.ceil(totalItems / ITEMS_PER_PAGE),
        lastVisible,
        hasMore: patientsData.length === ITEMS_PER_PAGE
      }));
      
    } catch (err) {
      console.error('Error fetching patients:', err);
      setError('Failed to load patient data. Please try again later.');
      throw err;
    } finally {
      setLoading(false);
      if (isInitialLoad) setIsInitialLoad(false);
    }
  }, [searchTerm, filters, pagination.lastVisible, isInitialLoad]);

  // Initial load and when search/filters change
  useEffect(() => {
    fetchPatients(1, true);
  }, [searchTerm, filters]);

  // Handle infinite scroll
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= 
        document.documentElement.offsetHeight - 100 &&
        !loading && 
        pagination.hasMore
      ) {
        fetchPatients(pagination.currentPage + 1);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [fetchPatients, loading, pagination]);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPatients(1, true);
  };

  const renderSkeletons = () => {
    return Array(3).fill(0).map((_, index) => (
      <PatientCardSkeleton key={index} />
    ));
  };

  if (error && !patients.length) {
    return (
      <div className="p-4 text-red-600 bg-red-50 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-800">My Patients</h1>
        
        <div className="mt-4 md:mt-0 flex space-x-2">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative">
              <input
                type="text"
                placeholder="Search patients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
              />
              <FiSearch className="absolute left-3 top-3 text-gray-400" />
            </div>
          </form>
          
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <FiFilter className="text-gray-600" />
          </button>
        </div>
      </div>
      
      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Active</label>
                <select
                  value={filters.lastActive}
                  onChange={(e) => setFilters({...filters, lastActive: e.target.value})}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">Any Time</option>
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {selectedPatient ? (
        <div>
          <button 
            onClick={() => setSelectedPatient(null)}
            className="flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <FiChevronLeft className="mr-1" /> Back to Patients
          </button>
          
          <div className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100">
            <div className="p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
                <div className="flex items-center mb-4 md:mb-0">
                  <div className="bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center text-blue-600 font-bold text-2xl mr-4">
                    {selectedPatient.fullName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-gray-800">{selectedPatient.fullName || 'Unnamed Patient'}</h2>
                    <p className="text-gray-500">Patient</p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                    Send Message
                  </button>
                  <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                    View Full Profile
                  </button>
                </div>
              </div>
              
              {/* Patient Details */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="lg:col-span-2">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-medium text-gray-700 mb-3">Contact Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500">Email</p>
                        <p className="font-medium">
                          {selectedPatient.email || 'Not provided'}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <p className="font-medium">
                          {selectedPatient.phone ? (
                            <a href={`tel:${selectedPatient.phone}`} className="text-blue-600 hover:underline">
                              {selectedPatient.phone}
                            </a>
                          ) : 'Not provided'}
                        </p>
                      </div>
                      {selectedPatient.age && (
                        <div>
                          <p className="text-sm text-gray-500">Age</p>
                          <p className="font-medium">{selectedPatient.age}</p>
                        </div>
                      )}
                      {selectedPatient.city && (
                        <div>
                          <p className="text-sm text-gray-500">Location</p>
                          <p className="font-medium">{selectedPatient.city}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-700 mb-3">Quick Stats</h3>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm text-gray-500">Last Session</p>
                      <p className="font-medium">2 days ago</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Total Sessions</p>
                      <p className="font-medium">12</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Current Mood</p>
                      <div className="flex items-center">
                        <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
                        <span className="font-medium">Good</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Mood Chart */}
              <div className="mb-8">
                <MoodChart patientId={selectedPatient.id} />
              </div>
              
              {/* Additional insights */}
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Therapist Notes</h3>
                <div className="prose max-w-none text-gray-600">
                  <p className="mb-4">
                    {selectedPatient.fullName || 'The patient'} has shown consistent improvement in mood over the past month. 
                    They've been actively engaging with the therapy exercises and completing their journal entries.
                  </p>
                  <p className="mb-4">
                    <span className="font-medium">Key Observations:</span>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                      <li>Responds well to cognitive behavioral therapy techniques</li>
                      <li>Has been practicing mindfulness exercises regularly</li>
                      <li>Shows increased self-awareness in recent sessions</li>
                    </ul>
                  </p>
                  <p>
                    <span className="font-medium">Next Steps:</span> Consider introducing more advanced coping strategies in the next session.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : patients.length === 0 && !loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <motion.div
              key={patient.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              layout
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-100 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-blue-100 rounded-full w-12 h-12 flex items-center justify-center text-blue-600 font-bold text-xl mr-4">
                    {patient.fullName?.charAt(0) || 'P'}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">{patient.fullName || 'Unnamed Patient'}</h3>
                    <p className="text-sm text-gray-500">Patient</p>
                  </div>
                </div>
                
                <div className="space-y-3 text-sm text-gray-600">
                  {patient.email && (
                    <div className="flex items-start">
                      <svg className="w-4 h-4 text-gray-400 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <a href={`mailto:${patient.email}`} className="hover:text-blue-600 break-all">
                        {patient.email}
                      </a>
                    </div>
                  )}
                  
                  {patient.phone && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${patient.phone.replace(/\D/g, '')}`} className="hover:text-blue-600">
                        {patient.phone}
                      </a>
                    </div>
                  )}
                  
                  {patient.age && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      <span>{patient.age} years old</span>
                    </div>
                  )}
                  
                  {patient.city && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>{patient.city}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full bg-blue-50 text-blue-600 hover:bg-blue-100 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPatient(patient);
                    }}
                  >
                    View Details
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ))}
          
          {/* Loading skeletons */}
          {loading && !isInitialLoad && renderSkeletons()}
          
          {/* Empty state */}
          {!loading && patients.length === 0 && (
            <div className="col-span-full py-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  vectorEffect="non-scaling-stroke"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No patients found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm 
                  ? 'No patients match your search criteria.'
                  : 'Get started by adding a new patient.'}
              </p>
              <div className="mt-6">
                <button
                  type="button"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg
                    className="-ml-1 mr-2 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  New Patient
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Showing <span className="font-medium">{(pagination.currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to{' '}
              <span className="font-medium">
                {Math.min(pagination.currentPage * ITEMS_PER_PAGE, pagination.totalItems)}
              </span>{' '}
              of <span className="font-medium">{pagination.totalItems}</span> patients
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => fetchPatients(pagination.currentPage - 1, true)}
                disabled={pagination.currentPage === 1}
                className={`px-3 py-1 border rounded-md ${pagination.currentPage === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <FiChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => fetchPatients(pagination.currentPage + 1, true)}
                disabled={!pagination.hasMore}
                className={`px-3 py-1 border rounded-md ${!pagination.hasMore ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
              >
                <FiChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}
      )}
    </div>
  );
}

export default withErrorBoundary(TherapistPatients);
