# VivaVault — IITM BS Viva Preparation Platform

A premium student preparation platform for IITM BS project vivas. Built with React, Firebase, and Tailwind CSS.

## Setup

### 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Authentication** → Sign-in methods → Enable **Google** and **Email/Password**
4. Enable **Cloud Firestore** → Create database in **production mode**

### 2. Firestore Security Rules

In Firestore → Rules, paste:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

> ⚠️ For production, restrict write access to authenticated users and admin-only operations.

### 3. Get Firebase Config

1. In Firebase Console → Project Settings → Your apps → Add a Web app
2. Copy the config values

### 4. Environment Variables

Create a `.env` file in the project root:

```
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_ADMIN_EMAIL=your_admin_email@gmail.com
```

### 5. Run Locally

```bash
npm install
npm run dev
```

### 6. Deploy to Vercel

1. Push to GitHub
2. Import in [Vercel](https://vercel.com)
3. Add environment variables in Vercel dashboard
4. Deploy — zero configuration needed

## JSON Import Format

Import questions via the admin panel. Minimal required fields:

```json
[
  {
    "question": "What is Flask?",
    "answer": "Flask is a micro web framework for Python."
  }
]
```

Optional fields: `category`, `frequency`, `tip`, `projectTip`, `codeExample`, `codeLanguage`, `proctors`, `projectId`

## Tech Stack

- **Frontend**: React + Vite + TypeScript + Tailwind CSS
- **Backend**: Firebase Auth + Cloud Firestore
- **Editor**: Tiptap (collaborative rich text editing)
- **Animations**: Framer Motion
- **Icons**: Lucide React
