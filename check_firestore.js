const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function check() {
  require('dotenv').config({ path: '.env.local' });
  let serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  initializeApp({
    credential: cert(serviceAccount)
  });

  const db = getFirestore();
  try {
    const snapshot = await db.collection('users').limit(1).get();
    console.log("Successfully read from Firestore. Found users:", snapshot.size);
  } catch (err) {
    console.error("Error reading from Firestore:", err.message);
  }
}

check();
