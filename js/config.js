/* =========================================================================
   PASTE YOUR FIREBASE CONFIG HERE
   Firebase console → Project settings → General → Your apps → Web app → SDK setup
   This only needs Firestore — no Auth required.
   ========================================================================= */
const firebaseConfig = {
  apiKey: "PASTE_ME",
  authDomain: "PASTE_ME",
  projectId: "PASTE_ME",
  storageBucket: "PASTE_ME",
  messagingSenderId: "PASTE_ME",
  appId: "PASTE_ME"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const docRef = db.collection("marathon").doc("state");
