import { useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "./firebase-config.js";
import { MoodProvider } from "./contexts/MoodContext.jsx";
import { PatientProvider } from "./contexts/PatientContext.jsx";
import { checkOpenAIConfiguration, logNetworkRequests } from "./utils/diagnostics.js";

// Layout and shared components
import Layout from "./components/shared/Layout.jsx";
import UserTypeSelection from "./components/shared/user-type-selection.jsx";
import ErrorBoundary from "./components/shared/ErrorBoundary.jsx";

// Patient components
import PatientAuth from "./components/patients/patient-auth.jsx";
import PatientDashboard from "./components/patients/patient-dashboard.jsx";
import Home from "./components/patients/home.jsx";
import MoodTracker from "./components/patients/mood-tracker.jsx";
import ThoughtRecord from "./components/patients/thought-record.jsx";
import CBTGames from "./components/patients/cbt-games.jsx";
import Journaling from "./components/patients/journaling.jsx";
import Community from "./components/patients/community.jsx";
import BookCall from "./components/patients/book-call.jsx";
import AIBot from "./components/patients/ai-bot.jsx";
import AiChatbot from "./components/patients/ai-chatbot.jsx";
import PatientTherapistChat from "./components/patients/patient-therapist-chat.jsx";

// Therapist components
import TherapistAuth from "./components/therapist/therapist-auth.jsx";
import TherapistDashboard from "./components/therapist/TherapistDashboard.jsx";
import TherapistAnalytics from "./components/therapist/TherapistAnalytics.jsx";
import TherapistAppointments from "./components/therapist/TherapistAppointments.jsx";
import TherapistMessages from "./components/therapist/TherapistMessages.jsx";
import TherapistReports from "./components/therapist/TherapistReports.jsx";
import TherapistActivities from "./components/therapist/TherapistActivities.jsx";
import AdminTherapists from "./components/therapist/admin-therapists.jsx";
import TherapistPatientDetails from "./components/therapist/TherapistPatientDetails.jsx";

// Shared components
import Profile from "./components/shared/profile.jsx";
import Settings from "./components/shared/settings.jsx";

// Test components (keep in root for easy access)
import OpenAITest from "./components/openai-test.jsx";
import SimpleOpenAITest from "./components/simple-openai-test.jsx";
import GeminiTest from "./components/gemini-test.jsx";

// Legacy components for backward compatibility
import Login from "./components/login.jsx";
import Logout from "./components/logout.jsx";
import TherapistLogin from "./components/therapist-login.jsx";
import TherapistLogout from "./components/therapist-logout.jsx";

function AppRoutes() {
  const navigate = useNavigate();
  const [user, setUser] = useState(undefined); // undefined = loading
  const [userType, setUserType] = useState(null);
  const [profileComplete, setProfileComplete] = useState(undefined);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        console.log('🔍 Checking user role for:', currentUser.uid, currentUser.email);
        
        // Check user type from users collection
        try {
          const { doc, getDoc } = await import('firebase/firestore');
          
          // Check users collection for userType
          console.log('📋 Checking users collection for userType...');
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log('✅ Found in users collection:', userData);
            const finalUserType = userData.userType || 'patient';
            console.log('🎯 Final userType:', finalUserType);
            setUserType(finalUserType);
            // Determine profile completeness
            const isComplete = (ud) => {
              if ((ud.userType || 'patient') === 'therapist') {
                const phoneAny = ud.phone || ud.phone1;
                return !!(ud.fullName && ud.email && phoneAny && (ud.city || ud.location) && (ud.degree) && (ud.bio) && (ud.experience !== undefined));
              } else {
                return !!(ud.fullName && ud.email && (ud.age !== undefined) && ud.city && ud.bio);
              }
            };
            setProfileComplete(isComplete(userData));
          } else {
            console.log('❌ Not found in users collection - defaulting to patient');
            setUserType('patient'); // Default to patient
            setProfileComplete(false);
          }
        } catch (error) {
          console.error('❗ Error checking user type:', error);
          setUserType('patient'); // Default to patient on error
          setProfileComplete(false);
        }
      } else {
        console.log('👤 No user logged in');
        setUserType(null);
        setProfileComplete(undefined);
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-blue-600 font-medium">Loading RehabQuest...</p>
        </div>
      </div>
    );
  }

  // If no user is logged in, show the user type selection
  if (!user) {
    return (
      <Layout>
        <Routes>
          <Route path="/" element={<UserTypeSelection />} />
          <Route path="/patient/auth" element={<PatientAuth />} />
          <Route path="/therapist/auth" element={<TherapistAuth />} />
          
          {/* Legacy routes - redirect to new auth flow */}
          <Route path="/login" element={<PatientAuth />} />
          <Route path="/therapist/login" element={<TherapistAuth />} />
          <Route path="*" element={<UserTypeSelection />} />
        </Routes>
      </Layout>
    );
  }

  // If user is logged in and profile incomplete, force profile completion
  if (user && profileComplete === false) {
    const to = userType === 'therapist' ? '/therapist/profile' : '/patient/profile';
    return (
      <Layout userType={userType}>
        <Routes>
          {userType === 'therapist' ? (
            <>
              <Route path="/therapist/profile" element={<Profile />} />
              <Route path="/therapist/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/therapist/profile" replace />} />
            </>
          ) : (
            <>
              <Route path="/patient/profile" element={<Profile />} />
              <Route path="/patient/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/patient/profile" replace />} />
            </>
          )}
        </Routes>
      </Layout>
    );
  }

  // If user is logged in, show appropriate dashboard
  return (
    <Layout userType={userType}>
      <Routes>
        {/* Main dashboard routes - redirect based on user type */}
        <Route 
          path="/" 
          element={
            userType === 'therapist'
              ? <Navigate to="/therapist/dashboard" replace />
              : <Navigate to="/patient/dashboard" replace />
          }
        />
        
        {/* Patient routes - only for patients */}
        {userType !== 'therapist' ? (
          <>
            <Route path="/patient/dashboard" element={<PatientDashboard />} />
            <Route path="/patient/mood-tracker" element={<MoodTracker />} />
            <Route path="/patient/thought-record" element={<ThoughtRecord />} />
            <Route path="/patient/cbt-games" element={<CBTGames />} />
            <Route path="/patient/journaling" element={<Journaling />} />
            <Route path="/patient/community" element={<Community />} />
            <Route path="/patient/book-call" element={<BookCall />} />
            <Route path="/patient/ai" element={<AIBot />} />
            <Route path="/patient/chat" element={<AiChatbot />} />
            <Route path="/patient/pt-chat" element={<PatientTherapistChat />} />
            <Route path="/patient/profile" element={<Profile />} />
            <Route path="/patient/settings" element={<Settings />} />
          </>
        ) : (
          <>
            <Route path="/patient/*" element={<Navigate to="/therapist/dashboard" replace />} />
          </>
        )}
        
        {/* Therapist routes - only for therapists */}
        {userType === 'therapist' ? (
          <>
            <Route path="/therapist/dashboard" element={<TherapistDashboard />} />
            <Route path="/therapist/patients" element={<AdminTherapists />} />
            <Route path="/therapist/analytics" element={<TherapistAnalytics />} />
            <Route path="/therapist/appointments" element={<TherapistAppointments />} />
            <Route path="/therapist/messages" element={<TherapistMessages />} />
            <Route path="/therapist/reports" element={<TherapistReports />} />
            <Route path="/therapist/activities" element={<TherapistActivities />} />
            <Route path="/therapist/patients/:patientId" element={<TherapistPatientDetails />} />
            <Route path="/therapist/profile" element={<Profile />} />
            <Route path="/therapist/settings" element={<Settings />} />
          </>
        ) : (
          <>
            <Route path="/therapist/*" element={<Navigate to="/patient/dashboard" replace />} />
          </>
        )}
        
        {/* Legacy patient routes (maintain backward compatibility) */}
        {userType !== 'therapist' ? (
          <>
            <Route path="/mood-tracker" element={<MoodTracker />} />
            <Route path="/thought-record" element={<ThoughtRecord />} />
            <Route path="/cbt-games" element={<CBTGames />} />
            <Route path="/journaling" element={<Journaling />} />
            <Route path="/community" element={<Community />} />
            <Route path="/book-call" element={<BookCall />} />
            <Route path="/ai" element={<AIBot />} />
            <Route path="/chat" element={<AiChatbot />} />
            <Route path="/pt-chat" element={<PatientTherapistChat />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
          </>
        ) : (
          <Route path="/:legacy(mood-tracker|thought-record|cbt-games|journaling|community|book-call|ai|chat|pt-chat|profile|settings)/*" element={<Navigate to="/therapist/dashboard" replace />} />
        )}
        
        {/* Admin/Test routes */}
        <Route path="/admin/therapists" element={<AdminTherapists />} />
        <Route path="/test-openai" element={<OpenAITest />} />
        <Route path="/simple-test" element={<SimpleOpenAITest />} />
        <Route path="/gemini-test" element={<GeminiTest />} />
        
        {/* Legacy auth routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/logout" element={<Logout />} />
        <Route path="/therapist/login" element={<TherapistLogin />} />
        <Route path="/therapist/logout" element={<TherapistLogout />} />
      </Routes>
    </Layout>
  );
}

function App() {
  useEffect(() => {
    // Run OpenAI diagnostics on app startup
    if (import.meta.env.DEV) {
      console.log('🔧 Running OpenAI diagnostics...');
      checkOpenAIConfiguration().catch(console.error);
      logNetworkRequests();
    }
  }, []);

  return (
    <Router>
      <MoodProvider>
        <PatientProvider>
          <ErrorBoundary>
            <AppRoutes />
          </ErrorBoundary>
        </PatientProvider>
      </MoodProvider>
    </Router>
  );
}

export default App;
