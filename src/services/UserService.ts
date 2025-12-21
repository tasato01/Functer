import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { ADMIN_UIDS } from '../constants/admin';

export interface UserProfile {
    uid: string;
    isBanned?: boolean;
    displayName?: string;
    isAdmin?: boolean;
    email?: string;
}

export interface AdminRequest {
    id: string;
    uid: string;
    email: string; // Providing email helps verify identity
    displayName: string;
    createdAt: number;
    status: 'pending' | 'approved' | 'rejected';
}

import { levelService } from './FirebaseLevelService';
import { updateProfile } from 'firebase/auth';
import { auth } from './firebase';

export const UserService = {
    // Sync user data to Firestore on login
    async syncUser(user: { uid: string, email: string | null, displayName: string | null }): Promise<void> {
        if (!user.uid) return;
        try {
            const userRef = doc(db, 'users', user.uid);
            // Use setDoc with merge to create or update
            // We only update essential info that might have changed (e.g. email, name from provider)
            // But we respect existing isAdmin/isBanned flags.
            await setDoc(userRef, {
                uid: user.uid,
                email: user.email || '',
                displayName: user.displayName || 'Unknown',
                lastLoginAt: Date.now()
            }, { merge: true });
        } catch (e) {
            console.error("Failed to sync user", e);
        }
    },

    async getAllUsers(): Promise<UserProfile[]> {
        try {
            const snapshot = await getDocs(collection(db, 'users'));
            return snapshot.docs.map(doc => ({
                uid: doc.id,
                ...doc.data()
            } as UserProfile));
        } catch (e) {
            console.error("Failed to get all users", e);
            return [];
        }
    },

    async updateUserProfile(uid: string, newName: string): Promise<boolean> {
        try {
            const user = auth.currentUser;
            if (!user || user.uid !== uid) return false;

            // 1. Update Firebase Auth Profile
            await updateProfile(user, { displayName: newName });

            // 2. Update Firestore User Doc
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, { displayName: newName }, { merge: true });

            // 3. Batch update all levels authored by this user
            await levelService.updateAuthorName(uid, newName);

            return true;
        } catch (e) {
            console.error("Failed to update user profile", e);
            return false;
        }
    },

    async revokeAdmin(uid: string): Promise<boolean> {
        try {
            const userRef = doc(db, 'users', uid);
            await setDoc(userRef, { isAdmin: false }, { merge: true });
            return true;
        } catch (e) {
            console.error("Failed to revoke admin", e);
            return false;
        }
    },

    async checkBanStatus(uid: string): Promise<boolean> {
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                return !!data.isBanned;
            }
            return false;
        } catch (e) {
            console.error("Failed to check ban status", e);
            return false;
        }
    },

    async isAdmin(uid: string): Promise<boolean> {
        // 1. Static check
        if (ADMIN_UIDS.includes(uid)) return true;

        // 2. Dynamic check (Firestore)
        try {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
                const data = userDoc.data() as UserProfile;
                return !!data.isAdmin;
            }
        } catch (e) {
            console.error("Failed to check admin status", e);
        }
        return false;
    },

    async requestAdminAccess(user: { uid: string, email: string | null, displayName: string | null }): Promise<boolean> {
        try {
            // Check if already exists
            // Ideally should query if pending request exists, but for now just add
            await addDoc(collection(db, 'admin_requests'), {
                uid: user.uid,
                email: user.email || 'No Email',
                displayName: user.displayName || 'Unknown',
                createdAt: Date.now(),
                status: 'pending'
            });
            return true;
        } catch (e) {
            console.error("Failed to request admin access", e);
            return false;
        }
    },

    async getAdminRequests(): Promise<AdminRequest[]> {
        try {
            const q = query(
                collection(db, 'admin_requests'),
                where('status', '==', 'pending'),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as AdminRequest));
        } catch (e) {
            console.error("Failed to fetch admin requests", e);
            return [];
        }
    },

    async approveAdminRequest(req: AdminRequest): Promise<boolean> {
        try {
            // 1. Mark user as admin
            const userRef = doc(db, 'users', req.uid);
            await setDoc(userRef, { isAdmin: true }, { merge: true });

            // 2. Delete request
            await deleteDoc(doc(db, 'admin_requests', req.id));

            return true;
        } catch (e) {
            console.error("Failed to approve admin request", e);
            return false;
        }
    }
};
