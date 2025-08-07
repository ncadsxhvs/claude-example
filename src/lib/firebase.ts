import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC2RHEM4oS-Z7bm1tNQYFN4Y3TNZgFGqFk",
  authDomain: "claudetest-412de.firebaseapp.com",
  projectId: "claudetest-412de",
  storageBucket: "claudetest-412de.firebasestorage.app",
  messagingSenderId: "924723558296",
  appId: "1:924723558296:web:d192fe15cf70778ea5dded"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();