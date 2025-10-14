import { initializeApp, getApps, getApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyALOy2OFQPjR9hMM1Re2RaSst3DFbIf6n8",
  authDomain: "solar-2258d.firebaseapp.com",
  databaseURL: "https://solar-2258d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "solar-2258d",
  storageBucket: "solar-2258d.firebasestorage.app",
  messagingSenderId: "268374415955",
  appId: "1:268374415955:web:a6dfaf45e28133d0e7c4a6",
  measurementId: "G-85S82FYSSJ",
}

const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
export const db = getFirestore(app)
