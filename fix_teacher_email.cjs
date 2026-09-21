const fs = require('fs');

let file = 'src/app/api/students/route.ts';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
  /return \{\n\s*id: docSnap\.id,\n\s*uid: teacherUid,\n\s*fullName: fullName \|\| \"Unnamed Teacher\",/g,
  'return {\n            id: docSnap.id,\n            uid: teacherUid,\n            fullName: fullName || "Unnamed Teacher",\n            email: email || "No email available",'
);

fs.writeFileSync(file, code);
