/* =========================================================================
   PASTE YOUR FIREBASE CONFIG HERE
   Firebase console → Project settings → General → Your apps → Web app → SDK setup
   This only needs Firestore — no Auth required.
   ========================================================================= */
const firebaseConfig = {
  apiKey: "AIzaSyA5kSKgCFGL-1iJR5aas8H0JY_bcwiawoo",
  authDomain: "darts-marathon-4dd07.firebaseapp.com",
  projectId: "darts-marathon-4dd07",
  storageBucket: "darts-marathon-4dd07.firebasestorage.app",
  messagingSenderId: "459886562175",
  appId: "1:459886562175:web:33b4018076dcc65fe8684a",
  measurementId: "G-Z7FYMPF227"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const docRef = db.collection("marathon").doc("state");
