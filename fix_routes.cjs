const fs = require('fs');

// Fix requests/route.ts
let fileReq = 'src/app/api/requests/route.ts';
let codeReq = fs.readFileSync(fileReq, 'utf8');

codeReq = codeReq.replace(
  "...teachers.map(t => ({ ...t, kind: 'teacherRequests', teacherUid: t.uid, studentUid: undefined }))",
  "...teachers.map(t => ({ ...t, fullName: t.displayName, kind: 'teacherRequests', teacherUid: t.uid, studentUid: undefined }))"
);

codeReq = codeReq.replace(/, email: email \|\| ""/g, '');
codeReq = codeReq.replace(/, email: normalizedData\.email \|\| ""/g, '');

fs.writeFileSync(fileReq, codeReq);

// Fix students/route.ts
let fileStu = 'src/app/api/students/route.ts';
let codeStu = fs.readFileSync(fileStu, 'utf8');

// The error was that we were trying to insert email into membership creation
// Find the `await crMemRef.set({` logic (wait, we moved to Prisma! Let's just remove `email` from `membership.upsert` or `prisma.membership.create/update`)
codeStu = codeStu.replace(/email: crUserData\.email \|\| user\.email \|\| "",?/g, '');
codeStu = codeStu.replace(/email: (email \|\| ""|[^,}]+),/g, '');
fs.writeFileSync(fileStu, codeStu);
