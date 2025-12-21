import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { getFirestore, collection, addDoc, getDocs, query, where, orderBy } from "firebase/firestore";
import type { LevelConfig } from "../types/Level";
import { UserService } from "./UserService";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();

// Auth Helpers
export const signInWithGoogle = async () => {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        // Sync on Google login too (if name changed or new user)
        await UserService.syncUser({
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName
        });
        return result.user;
    } catch (error) {
        console.error("Login Failed", error);
        throw error;
    }
};

export const signUpWithEmail = async (email: string, pass: string, displayName: string) => {
    try {
        const result = await createUserWithEmailAndPassword(auth, email, pass);
        // Update Profile
        await updateProfile(result.user, { displayName });
        // Sync to Firestore
        await UserService.syncUser({
            uid: result.user.uid,
            email: result.user.email,
            displayName: displayName
        });
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
