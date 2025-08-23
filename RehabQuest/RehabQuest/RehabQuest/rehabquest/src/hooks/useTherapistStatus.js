import { useEffect } from 'react';
import { auth, db } from '../firebase-config.js';
import { doc, updateDoc, serverTimestamp, onSnapshot, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';

// Custom hook to manage therapist online/offline status
export const useTherapistStatus = () => {
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          // Only track therapists; check user doc
          const uref = doc(db, 'users', user.uid);
          const usnap = await getDoc(uref);
          if (!usnap.exists() || (usnap.data()?.userType !== 'therapist')) {
            return; // do not track non-therapists
          }

          // Update lastActiveAt when user logs in (merge to create if missing)
          await setDoc(uref, {
            lastActiveAt: serverTimestamp(),
            isOnline: true
          }, { merge: true });

          // Set up activity tracking
          const updateActivity = async () => {
            try {
              await setDoc(uref, {
                lastActiveAt: serverTimestamp()
              }, { merge: true });
            } catch (error) {
              console.error('Error updating activity:', error);
            }
          };

          // Update activity every 2 minutes while user is active
          const activityInterval = setInterval(updateActivity, 2 * 60 * 1000);

          // Update activity on user interaction
          const handleActivity = () => updateActivity();
          
          // Add event listeners for user activity
          document.addEventListener('mousedown', handleActivity);
          document.addEventListener('keypress', handleActivity);
          document.addEventListener('scroll', handleActivity);
          document.addEventListener('touchstart', handleActivity);

          // Set user as offline when they leave
          const handleBeforeUnload = async () => {
            try {
              await setDoc(uref, {
                isOnline: false,
                lastActiveAt: serverTimestamp()
              }, { merge: true });
            } catch (error) {
              console.error('Error setting offline status:', error);
            }
          };

          window.addEventListener('beforeunload', handleBeforeUnload);

          // Cleanup function
          return () => {
            clearInterval(activityInterval);
            document.removeEventListener('mousedown', handleActivity);
            document.removeEventListener('keypress', handleActivity);
            document.removeEventListener('scroll', handleActivity);
            document.removeEventListener('touchstart', handleActivity);
            window.removeEventListener('beforeunload', handleBeforeUnload);
            
            // Set user as offline when component unmounts
            if (user && user.uid) {
              setDoc(uref, {
                isOnline: false,
                lastActiveAt: serverTimestamp()
              }, { merge: true }).catch(console.error);
            }
          };
        } catch (error) {
          console.error('Error setting up therapist status tracking:', error);
        }
      }
    });

    return () => {
      unsubscribeAuth();
    };
  }, []);
};

// Utility function to determine if therapist is online
export const isTherapistOnline = (therapist) => {
  if (!therapist || !therapist.lastActiveAt) return false;
  
  // If explicitly set as online and active within last 10 minutes
  if (therapist.isOnline) {
    const lastActive = therapist.lastActiveAt.toDate ? therapist.lastActiveAt.toDate() : new Date(therapist.lastActiveAt);
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    return lastActive > tenMinutesAgo;
  }
  
  return false;
};
