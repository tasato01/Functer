import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy, doc, getDoc } from "firebase/firestore";
import type { LevelConfig } from "../types/Level";

const firebaseConfig = {
    apiKey: "AIzaSyBu3GnGlVhnt22oAQnNvsrdNlAeS_zYBTk",
    authDomain: "functer-69dd0.firebaseapp.com",
    projectId: "functer-69dd0",
    storageBucket: "functer-69dd0.firebasestorage.app",
    messagingSenderId: "58375292012",
    appId: "1:58375292012:web:b689c09bf54da3daed0449",
    measurementId: "G-889FKV7XHZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return result.user;
    } catch (error) {
        console.error("Login Failed", error);
        throw error;
    }
};

export const signUpWithEmail = async (email: string, pass: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        return result.user;
    } catch (error) {
        throw error;
    }
};

export const signInWithEmail = async (email: string, pass: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, pass);
        return result.user;
    } catch (error) {
        throw error;
    }
};

export const signOutUser = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Logout Failed", error);
    }
};

// Database Helpers
export const publishLevel = async (level: LevelConfig, user: any, authorAlias: string, solution: string) => {
    if (!user) throw new Error("Must be logged in to publish");

    const levelData = {
        title: level.name || "Untitled",
        description: level.description || "",
        difficulty: level.difficulty || "A",
        authorId: user.uid,
        authorName: authorAlias || user.displayName || "Anonymous", // Use alias if provided
        data: JSON.stringify(level),
        solution: solution, // Helper f(x)
        cleared: true, // Always true for published levels
        createdAt: new Date(),
        likes: 0,
        tier: 'user' // 'official' for admin
    };

    try {
        const docRef = await addDoc(collection(db, "levels"), levelData);
        console.log("Document written with ID: ", docRef.id);
        return docRef.id;
    } catch (e) {
        console.error("Error adding document: ", e);
        throw e;
    }
};

export const fetchLevels = async (filter: 'official' | 'user' | 'mine' = 'user', userId?: string) => {
    const levelsRef = collection(db, "levels");
    let q;

    if (filter === 'official') {
        q = query(levelsRef, where("tier", "==", "official"), orderBy("createdAt", "desc"));
    } else if (filter === 'mine' && userId) {
        q = query(levelsRef, where("authorId", "==", userId), orderBy("createdAt", "desc"));
    } else {
        q = query(levelsRef, where("tier", "==", "user"), orderBy("createdAt", "desc"));
    }

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));
};
