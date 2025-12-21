import { db } from './firebase';
import { doc, getDoc, setDoc, collection, addDoc, getDocs, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { ADMIN_UIDS } from '../constants/admin';

export interface UserProfile {
    uid: string;
    isBanned?: boolean;
    displayName?: string;
    isAdmin?: boolean;
}

export interface AdminRequest {
    id: string;
    uid: string;
    email: string; // Providing email helps verify identity
    displayName: string;
    createdAt: number;
    status: 'pending' | 'approved' | 'rejected';
}

export const UserService = {
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
            // Create a request in 'admin_requests' collection
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

            // 2. Update request status (or delete it)
            // Let's delete it to keep clean, or mark approved for history. 
            // Mark approved for history is better but cleaning up is easier for MVP.
            // Let's delete.
            await deleteDoc(doc(db, 'admin_requests', req.id));

            return true;
        } catch (e) {
            console.error("Failed to approve admin request", e);
            return false;
        }
    }
};
