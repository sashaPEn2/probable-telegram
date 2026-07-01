import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCqP2qw2yuOomLsooorB1XPdoDOT8-I3kg",
  authDomain: "reference-option-b5xj8.firebaseapp.com",
  projectId: "reference-option-b5xj8",
  storageBucket: "reference-option-b5xj8.firebasestorage.app",
  messagingSenderId: "1026829066533",
  appId: "1:1026829066533:web:ae730370b9c802e529facc",
  databaseId: "ai-studio-b620a1b8-816f-4f4d-8d4c-58202429cb3b"
};

const app = initializeApp(firebaseConfig);
export const db = firebaseConfig.databaseId ? getFirestore(app, firebaseConfig.databaseId) : getFirestore(app);
export const auth = getAuth(app);
