import { initializeApp } from "firebase/app";
import { getAuth, browserLocalPersistence, inMemoryPersistence } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";

// Initialize Firebase
const app = initializeApp({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
});

const google_auth = getAuth(app);
const db = getDatabase(app);
const firestore = getFirestore(app);


function isSessionStorageAvailable() {
  try {
    const test = "__test__";
    sessionStorage.setItem(test, test);
    sessionStorage.removeItem(test);
    return true;
  } catch (e) {
    return false;
  }
}

const storage = isSessionStorageAvailable() ? sessionStorage : {
  _data: {},
  setItem(key, val) { this._data[key] = String(val); },
  getItem(key) { return this._data[key] || null; },
  removeItem(key) { delete this._data[key]; },
};

google_auth.setPersistence(
  isSessionStorageAvailable() ? browserLocalPersistence : inMemoryPersistence
);

export { db, app, google_auth, firestore };
