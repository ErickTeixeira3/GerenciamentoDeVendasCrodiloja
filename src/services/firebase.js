import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAALbCsbUxIz_rvCLhnoglt-65q_9bmJpc",
  authDomain: "crodiloja-599eb.firebaseapp.com",
  projectId: "crodiloja-599eb",
  storageBucket: "crodiloja-599eb.firebasestorage.app",
  messagingSenderId: "290426560",
  appId: "1:290426560:web:c7849025b4fbc16326a725",
  measurementId: "G-G6CB6ZW3CY"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);


