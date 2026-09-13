# Attensheet

Attensheet is a dark, responsive attendance-management workspace for university classes. Class representatives create a class, invite teachers and students, and connect a Google Sheet that stores the attendance record. Firebase Authentication and Firestore hold identity, class metadata, memberships, permissions, and workflow state.

## Local development

1. Copy `.env.example` to `.env.local` and fill the Firebase client values.
2. Create a Firebase web app for project `attensheet-fuuast`.
3. Enable Email/Password and Google providers in Firebase Authentication.
4. Create a Firestore database and deploy `firestore.rules`.
5. Enable Google Sheets API and Google Drive API in Google Cloud.
6. Configure a Google OAuth Web application. Add `http://localhost:3000/api/google/callback` as a redirect URI and add the production Vercel callback after deployment.
7. Set server-only Google variables and a 32-byte `TOKEN_ENCRYPTION_KEY`.
8. Run `npm install` and `npm run dev`.

## Production security

Firebase client configuration is public configuration, not a password. Firestore Rules and server-side authorization are the security boundary. Keep Firebase Admin credentials, Google OAuth client secret, and token-encryption key server-only. Google Sheets uses `drive.file` plus Sheets scopes; refresh tokens must be encrypted before persistence. Attendance writes must be performed by authenticated server handlers that verify the Firebase identity, approved class membership, assigned subject, date, and immutable-lock state.

The OAuth consent screen, test users, enabled APIs, authorized origins, and Vercel environment variables require manual Google Cloud/Vercel configuration and cannot be safely generated from this repository.
