import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, GithubAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCicPKlEWeiZMewAcXaZ9JvyqCqtLZcpsQ",
  authDomain: "iitmbsprojects.firebaseapp.com",
  projectId: "iitmbsprojects",
  storageBucket: "iitmbsprojects.firebasestorage.app",
  messagingSenderId: "1062464836693",
  appId: "1:1062464836693:web:9bb09aa89502e544db30dc",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
export const githubProvider = new GithubAuthProvider();
