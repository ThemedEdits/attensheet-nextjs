const fs = require('fs');

// Fix class/join/route.ts
let joinFile = 'src/app/api/class/join/route.ts';
let joinCode = fs.readFileSync(joinFile, 'utf8');
joinCode = joinCode.replace(/profile\.name/g, 'profile.displayName');
fs.writeFileSync(joinFile, joinCode);

// Fix requests/route.ts
let reqFile = 'src/app/api/requests/route.ts';
let reqCode = fs.readFileSync(reqFile, 'utf8');
// Type 'string | null | undefined' is not assignable to type 'string | null'. src/app/api/requests/route.ts(74,13)
reqCode = reqCode.replace(/email = email \|\| uSnap\?\.email;/g, 'email = email || uSnap?.email || null;');
fs.writeFileSync(reqFile, reqCode);

// Fix subjects/route.ts
let subFile = 'src/app/api/subjects/route.ts';
let subCode = fs.readFileSync(subFile, 'utf8');
subCode = subCode.replace(/fullName: student\.fullName, fatherName: student\.fatherName, seatNumber: student\.seatNumber/g, 'fullName: student.fullName ?? undefined, fatherName: student.fatherName ?? undefined, seatNumber: student.seatNumber ?? undefined');
fs.writeFileSync(subFile, subCode);

// Fix students/route.ts
let stuFile = 'src/app/api/students/route.ts';
let stuCode = fs.readFileSync(stuFile, 'utf8');
// Fix missing email on student mapping
stuCode = stuCode.replace(/let email = data\.email;/g, 'let email = data.user?.email || null;');
// We need to fetch email from User if membership doesn't have it.
stuCode = stuCode.replace(/email = email \|\| uSnap\.data\(\)\?\.email;/g, 'email = email || uSnap?.email;');
stuCode = stuCode.replace(/fullName = fullName \|\| uSnap\.data\(\)\?\.name;/g, 'fullName = fullName || uSnap?.displayName;');

// studentUid string | null issues
stuCode = stuCode.replace(/studentUid = url\.searchParams\.get\("studentUid"\);/, 'studentUid = url.searchParams.get("studentUid") || "";');
stuCode = stuCode.replace(/const studentUid = url\.searchParams\.get\("studentUid"\);/, 'const studentUid = url.searchParams.get("studentUid") || "";');

// missing email on teacher object
stuCode = stuCode.replace(/email = email \|\| uSnap\?\.email;/g, 'email = email || uSnap?.email || "";');

// Delete student uid null check
stuCode = stuCode.replace(/uid: studentUid } }\)/g, 'uid: studentUid! } })');
stuCode = stuCode.replace(/studentUid } }\)/g, 'studentUid: studentUid! } })');

fs.writeFileSync(stuFile, stuCode);
