// Import Firebase SDKs
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBzExrcsHlHJy_drIUWL0f9BeHZfwNTNzo",
  authDomain: "rehabquest-29b03.firebaseapp.com",
  projectId: "rehabquest-29b03",
  storageBucket: "rehabquest-29b03.appspot.com", // fixed .app to .appspot.com
  messagingSenderId: "612318637179",
  appId: "1:612318637179:web:f506c8cca69305cd0c86de",
  measurementId: "G-WB2VPLC6EM"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const provider = new GoogleAuthProvider();

// Export Firebase services so you can use them anywhere
export { app, analytics, auth, db, storage, provider };
