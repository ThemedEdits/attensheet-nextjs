import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as dotenv from 'dotenv';

async function migrate() {
  const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
  let serviceAccount = {
    projectId: envConfig.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: envConfig.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: envConfig.FIREBASE_ADMIN_PRIVATE_KEY,
  };

  initializeApp({ credential: cert(serviceAccount) });
  const db = getFirestore();
  const prisma = new PrismaClient();

  console.log("Starting migration...");

  try {
    // Users
    console.log("Migrating users...");
    const usersSnap = await db.collection("users").get();
    for (const doc of usersSnap.docs) {
      const data = doc.data();
      await prisma.user.upsert({
        where: { uid: doc.id },
        update: {},
        create: {
          uid: doc.id,
          email: data.email || null,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
          role: data.role || null,
        }
      });
    }

    // Classes
    console.log("Migrating classes...");
    const classesSnap = await db.collection("classes").get();
    for (const doc of classesSnap.docs) {
      const data = doc.data();
      await prisma.class.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          classCode: data.classCode,
          crUid: data.crUid,
          secondaryCrUid: data.secondaryCrUid || null,
          university: data.university || null,
          department: data.department || null,
          className: data.className || null,
          section: data.section || null,
          semester: data.semester || null,
          spreadsheetId: data.spreadsheetId || null,
        }
      });
    }

    // Memberships
    console.log("Migrating memberships...");
    const membershipsSnap = await db.collection("memberships").get();
    for (const doc of membershipsSnap.docs) {
      const data = doc.data();
      await prisma.membership.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          classId: data.classId,
          uid: data.uid,
          role: data.role,
          status: data.status,
          fullName: data.fullName || null,
          fatherName: data.fatherName || null,
          seatNumber: data.seatNumber || null,
          isSecondaryCr: data.isSecondaryCr || false,
        }
      });
    }

    // Subjects
    console.log("Migrating subjects...");
    const subjectsSnap = await db.collection("subjects").get();
    for (const doc of subjectsSnap.docs) {
      const data = doc.data();
      await prisma.subject.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          classId: data.classId,
          name: data.name,
          teacherUid: data.teacherUid || null,
          teacherName: data.teacherName || null,
          googleSheetTabId: data.googleSheetTabId != null ? String(data.googleSheetTabId) : null,
          active: data.active !== false,
        }
      });
    }

    // Attendance
    console.log("Migrating attendance...");
    const attendanceSnap = await db.collection("attendance").get();
    for (const doc of attendanceSnap.docs) {
      const data = doc.data();
      await prisma.attendance.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          classId: data.classId,
          subjectId: data.subjectId,
          date: data.date,
          studentUid: data.studentUid,
          present: data.present,
          markedBy: data.markedBy,
        }
      });
    }

    // Student Requests
    console.log("Migrating studentRequests...");
    const srSnap = await db.collection("studentRequests").get();
    for (const doc of srSnap.docs) {
      const data = doc.data();
      await prisma.studentRequest.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          classId: data.classId,
          uid: data.uid || "missing-uid-" + doc.id,
          status: data.status || "pending",
          fullName: data.fullName || null,
          fatherName: data.fatherName || null,
          seatNumber: data.seatNumber || null,
          email: data.email || null,
          photoURL: data.photoURL || null,
        }
      });
    }

    // Teacher Requests
    console.log("Migrating teacherRequests...");
    const trSnap = await db.collection("teacherRequests").get();
    for (const doc of trSnap.docs) {
      const data = doc.data();
      await prisma.teacherRequest.upsert({
        where: { id: doc.id },
        update: {},
        create: {
          id: doc.id,
          classId: data.classId,
          uid: data.uid || "missing-uid-" + doc.id,
          status: data.status || "pending",
          subjectName: data.subjectName || null,
          email: data.email || null,
          displayName: data.displayName || null,
          photoURL: data.photoURL || null,
        }
      });
    }

    console.log("Migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
