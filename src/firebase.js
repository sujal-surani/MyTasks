// =====================================================
// Firebase Configuration
// Replace the placeholder values below with your
// actual Firebase project config from:
// console.firebase.google.com → Project Settings → SDK
// =====================================================
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Firestore document path for all dashboard state
export const DASHBOARD_DOC = "users/my_dashboard_state";
