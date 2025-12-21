import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

export interface UserProfile {
    uid: string;
    isBanned?: boolean;
    displayName?: string;
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
            // Default to not banned on error to avoid blocking legit users due to network issues?
            // Or block for safety? Let's default to false (allow) for now.
            return false;
        }
    }
};
