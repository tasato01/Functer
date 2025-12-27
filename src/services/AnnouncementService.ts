import { collection, addDoc, getDocs, query, orderBy, limit, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export interface Announcement {
    id: string;
    title?: string;
    message: string;
    type: 'info' | 'maintenance' | 'update' | 'important';
    createdAt: number;
}

export const AnnouncementService = {
    async getLatestAnnouncement(): Promise<Announcement | null> {
        try {
            const q = query(
                collection(db, 'announcements'),
                orderBy('createdAt', 'desc'),
                limit(1)
            );
            const snapshot = await getDocs(q);
            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title,
                message: data.message,
                type: data.type || 'info',
                createdAt: (data.createdAt as Timestamp).toMillis()
            };
        } catch (e) {
            console.error("Failed to fetch announcement", e);
            return null;
        }
    },

    async addAnnouncement(message: string, type: 'info' | 'maintenance' | 'update' | 'important', title?: string): Promise<boolean> {
        try {
            await addDoc(collection(db, 'announcements'), {
                title: title || null,
                message,
                type,
                createdAt: Timestamp.now()
            });
            return true;
        } catch (e) {
            console.error("Failed to add announcement", e);
            return false;
        }
    }
};
