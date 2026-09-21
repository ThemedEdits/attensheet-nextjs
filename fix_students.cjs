const fs = require('fs');

let file = 'src/app/api/students/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Fix 1: let email = data.user?.email || null; back to let email = null;
code = code.replace(/let email = data\.user\?\.email \|\| null;/g, 'let email = null;');

// Fix 2: missing email on teacher object
code = code.replace(/email: email \|\| uSnap\?\.email \|\| "",/g, 'email: email || (uSnap ? uSnap.email : "") || "",');

// Ensure email is set properly when mapping teachers
code = code.replace(
  /return \{\n\s*id: docSnap\.id,\n\s*uid: teacherUid,/,
  'return {\n            id: docSnap.id,\n            uid: teacherUid,\n            email: email || "No email available",'
);

fs.writeFileSync(file, code);

// Also remove prisma.config.ts and src/prisma/db.ts if they are unused or ignore them, but let's just ignore them since they are configuration files.
