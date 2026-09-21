const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const fs = require('fs');

async function exportData() {
  require('dotenv').config({ path: '.env.local' });
  let serviceAccount = {
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  
  const collections = ['users', 'classes', 'memberships', 'studentRequests', 'teacherRequests'];
  const data = {};

  for (const collName of collections) {
    try {
      console.log(`Exporting ${collName}...`);
      const snap = await db.collection(collName).get();
      data[collName] = [];
      snap.forEach(doc => {
        data[collName].push({ id: doc.id, ...doc.data() });
      });
      console.log(`Exported ${snap.size} documents from ${collName}.`);
    } catch (e) {
      console.error(`Error exporting ${collName}:`, e.message);
    }
  }

  fs.writeFileSync('firestore_export.json', JSON.stringify(data, null, 2));
  console.log('Export complete.');
}

exportData();
