import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDbj3djWL14hivgsqHTYORk91ROqqGJrZ4",
  authDomain: "seleric-dashboard.firebaseapp.com",
  projectId: "seleric-dashboard",
  storageBucket: "seleric-dashboard.firebasestorage.app",
  messagingSenderId: "831699559921",
  appId: "1:831699559921:web:7b6e705857241be93b9050",
  measurementId: "G-RVWYP5BKBF"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app); 