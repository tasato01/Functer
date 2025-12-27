import { collection, addDoc, getDocs, query, where, doc, getDoc, deleteDoc, updateDoc, increment, writeBatch, Timestamp, limit } from "firebase/firestore";
import { db, auth } from "./firebase";
import type { ILevelService } from "./LevelService";
import type { LevelConfig } from "../types/Level";
import { ADMIN_UIDS } from "../constants/admin";
import { UserService } from "./UserService";

const LEVELS_COLLECTION = "levels";

// Firestore Document Data Structure
interface FirestoreLevelData {
    title: string;
    description: string;
    difficulty: string;
    authorId: string;
    authorName: string;
    data: string; // JSON stringified LevelConfig
    solution: string | null;
    tier: 'official' | 'user';
    order?: number; // Official Order
    createdAt: Timestamp;
    likes: number;
    plays: number;
    ratingTotal?: number;
    ratingCount?: number;
}

export class FirebaseLevelService implements ILevelService {

    // In-memory cache
    private cache: {
        official: LevelConfig[] | null;
        user: LevelConfig[] | null;
        timestamp: number;
    } = { official: null, user: null, timestamp: 0 };

    private CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    async getOfficialLevels(forceRefresh = false): Promise<LevelConfig[]> {
        if (!forceRefresh && this.cache.official && (Date.now() - this.cache.timestamp < this.CACHE_DURATION)) {
            console.log("Using Cached Official Levels");
            return this.cache.official;
        }

        console.log("Fetching Official Levels from Firestore...");
        try {
            const q = query(
                collection(db, LEVELS_COLLECTION),
                where("tier", "==", "official")
                // Sort by 'order' ascending, then creation
            );

            const snapshot = await getDocs(q);
            const levels = snapshot.docs.map(doc => this.mapDocToLevel(doc));

            // Client-side sort by order
            levels.sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));

            this.cache.official = levels;
            this.cache.timestamp = Date.now();
            return levels;
        } catch (e) {
            console.error("Failed to fetch official levels", e);
            return [];
        }
    }

    async getUserLevels(options?: { authorId?: string, sort?: 'newest' | 'oldest' | 'likes' | 'rating' | 'plays' }, forceRefresh = false): Promise<LevelConfig[]> {
        const { authorId, sort } = options || {};

        // Cache check only if fetching ALL user levels (no specific author) and default sort (newest)
        const isDefaultSort = !sort || sort === 'newest';
        if (!authorId && isDefaultSort && !forceRefresh && this.cache.user && (Date.now() - this.cache.timestamp < this.CACHE_DURATION)) {
            console.log("Using Cached User Levels");
            return this.cache.user;
        }

        console.log(`Fetching Levels from Firestore... authorId=${authorId || 'ALL'}`);
        try {
            let q;
            if (authorId) {
                // Fetch specific user's levels (both user and official tiers)
                q = query(
                    collection(db, LEVELS_COLLECTION),
                    where("authorId", "==", authorId)
                );
            } else {
                // Fetch public user levels
                // NOTE: For 'likes'/'plays' sort of ALL levels, we strictly should use orderBy() in Firestore.
                // However, without composite indexes, this fails.
                // For MVP, if we use limit(50), retrieving 50 newest and sorting by likes is wrong (it only finds liked ones among newest).
                // But getting ALL levels to sort locally is expensive.
                // Compromise: Retrieve moderate amount (e.g. 100) ordered by createdAt (default) and sort locally, OR try orderBy if index exists.
                // Let's stick to simple query for now and sort locally.
                // Ideally: q = query(..., orderBy("likes", "desc"), limit(50));

                q = query(
                    collection(db, LEVELS_COLLECTION),
                    where("tier", "==", "user"),
                    limit(100)
                );
            }

            const snapshot = await getDocs(q);
            const levels = snapshot.docs.map(doc => this.mapDocToLevel(doc));

            // Client-side sort
            const sortType = sort || 'newest';
            levels.sort((a, b) => {
                switch (sortType) {
                    case 'newest': return (b.createdAt || 0) - (a.createdAt || 0);
                    case 'oldest': return (a.createdAt || 0) - (b.createdAt || 0);
                    case 'likes': return (b.likes || 0) - (a.likes || 0);
                    case 'plays': return (b.plays || 0) - (a.plays || 0);
                    case 'rating':
                        const ra = (a.ratingTotal || 0) / (a.ratingCount || 1);
                        const rb = (b.ratingTotal || 0) / (b.ratingCount || 1);
                        return rb - ra;
                    default: return 0;
                }
            });

            // Only update "ALL" cache if this was a general fetch with default sort
            if (!authorId && isDefaultSort) {
                this.cache.user = levels;
                this.cache.timestamp = Date.now();
            }

            return levels;
        } catch (e) {
            console.error("Failed to fetch levels", e);
            return [];
        }
    }

    async getLevelById(id: string): Promise<LevelConfig | null> {
        // Check cache first
        const cached = this.cache.official?.find(l => l.id === id) || this.cache.user?.find(l => l.id === id);
        if (cached) return cached;

        try {
            const docRef = doc(db, LEVELS_COLLECTION, id);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return this.mapDocToLevel(docSnap);
            }
            return null;
        } catch (e) {
            console.error("Error fetching level by id", id, e);
            return null;
        }
    }

    async publishLevel(level: LevelConfig, solution?: string): Promise<boolean> {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in to publish.");
            return false;
        }

        // Ban Check
        const isBanned = await UserService.checkBanStatus(user.uid);
        if (isBanned) {
            alert("Your account is restricted from publishing.");
            return false;
        }

        try {
            const isOfficial = level.isOfficial && ADMIN_UIDS.includes(user.uid);

            const firestoreData: FirestoreLevelData = {
                title: level.name || "Untitled",
                description: level.description || "",
                difficulty: level.difficulty || "A",
                authorId: user.uid,
                authorName: level.authorName || user.displayName || "Anonymous",
                data: JSON.stringify(level),
                solution: solution || null,
                tier: isOfficial ? 'official' : 'user',
                ...(isOfficial ? { order: 9999 } : {}), // Only add order if official
                createdAt: Timestamp.now(),
                likes: 0,
                plays: 0,
                ratingTotal: 0,
                ratingCount: 0
            };

            await addDoc(collection(db, LEVELS_COLLECTION), firestoreData as any);

            // Invalidate cache
            this.cache.user = null;
            if (isOfficial) this.cache.official = null;

            return true;
        } catch (e) {
            console.error("Error publishing level", e);
            alert("Publish failed. See console.");
            return false;
        }
    }

    async deleteLevel(id: string): Promise<boolean> {
        const user = auth.currentUser;
        if (!user) return false;

        const isAdmin = ADMIN_UIDS.includes(user.uid);

        try {
            // Check ownership if not admin
            if (!isAdmin) {
                const target = await this.getLevelById(id);
                if (!target || target.authorId !== user.uid) {
                    alert("Permission Denied.");
                    return false;
                }
            }

            if (!confirm("Are you sure you want to delete this level from the server?")) return false;

            await deleteDoc(doc(db, LEVELS_COLLECTION, id));

            // Invalidate cache
            this.cache.user = null;
            this.cache.official = null;

            return true;
        } catch (e) {
            console.error("Delete failed", e);
            return false;
        }
    }

    async updateLevel(id: string, updates: Partial<LevelConfig>): Promise<boolean> {
        const user = auth.currentUser;
        if (!user) return false;
        const isAdmin = ADMIN_UIDS.includes(user.uid);

        try {
            const levelRef = doc(db, LEVELS_COLLECTION, id);

            // Check permissions
            if (!isAdmin) {
                const docSnap = await getDoc(levelRef);
                if (!docSnap.exists() || docSnap.data().authorId !== user.uid) {
                    alert("Permission Denied.");
                    return false;
                }
            }

            // Fetch current data to merge correctly
            const docSnap = await getDoc(levelRef);
            if (!docSnap.exists()) return false;

            const currentData = docSnap.data() as FirestoreLevelData;
            let currentConfig: LevelConfig;
            try {
                currentConfig = JSON.parse(currentData.data);
            } catch {
                currentConfig = { ...currentData } as any;
            }

            // Merge updates
            const newConfig = { ...currentConfig, ...updates };

            // Update fields mapping
            const updateData: any = {
                data: JSON.stringify(newConfig)
            };

            // Map standard fields for querying
            if (updates.name !== undefined) updateData.title = updates.name;
            if (updates.description !== undefined) updateData.description = updates.description;
            if (updates.difficulty !== undefined) updateData.difficulty = updates.difficulty;
            if (updates.hint !== undefined) updateData.hint = updates.hint; // Though hint might not be a top-level query field yet, adding if schema supports

            await updateDoc(levelRef, updateData);

            // Invalidate cache
            this.cache.user = null;
            this.cache.official = null;

            return true;
        } catch (e) {
            console.error("Update failed", e);
            return false;
        }
    }

    // --- Interaction Methods ---

    async incrementPlayCount(id: string): Promise<void> {
        try {
            const ref = doc(db, LEVELS_COLLECTION, id);
            await updateDoc(ref, {
                plays: increment(1)
            });
        } catch (e) {
            console.error("Failed to increment play count", e);
        }
    }

    async likeLevel(id: string): Promise<boolean> {
        // Note: Real app should check if user already liked (subcollection).
        // MVP: Just increment.
        try {
            const ref = doc(db, LEVELS_COLLECTION, id);
            await updateDoc(ref, {
                likes: increment(1)
            });
            return true;
        } catch (e) {
            console.error("Failed to like level", e);
            return false;
        }
    }

    async rateLevel(id: string, rating: number): Promise<boolean> {
        try {
            const ref = doc(db, LEVELS_COLLECTION, id);
            await updateDoc(ref, {
                ratingTotal: increment(rating),
                ratingCount: increment(1)
            });
            return true;
        } catch (e) {
            console.error("Failed to rate level", e);
            return false;
        }
    }

    async updateLevelOrder(levels: LevelConfig[]): Promise<boolean> {
        // Admin Only check ideally
        const user = auth.currentUser;
        if (!user || !ADMIN_UIDS.includes(user.uid)) return false;

        try {
            const batch = writeBatch(db);
            levels.forEach((l, index) => {
                if (!l.id) return;
                const ref = doc(db, LEVELS_COLLECTION, l.id);
                batch.update(ref, { order: index });
            });
            await batch.commit();

            this.cache.official = null; // Invalidate
            return true;
        } catch (e) {
            console.error("Failed to update order", e);
            return false;
        }
    }

    async updateAuthorName(authorId: string, newName: string): Promise<boolean> {
        try {
            console.log(`Updating author name for ${authorId} to ${newName}`);
            const q = query(
                collection(db, LEVELS_COLLECTION),
                where("authorId", "==", authorId)
            );
            const snapshot = await getDocs(q);

            const batch = writeBatch(db);
            snapshot.docs.forEach(doc => {
                batch.update(doc.ref, { authorName: newName });
            });

            await batch.commit();
            console.log(`Updated ${snapshot.size} levels with new author name.`);

            // Invalidate cache
            this.cache.user = null;
            this.cache.official = null;

            return true;
        } catch (e) {
            console.error("Failed to batch update author name", e);
            return false;
        }
    }

    // --- Solution Sharing ---

    async submitPlayerSolution(levelId: string, solution: string): Promise<void> {
        const user = auth.currentUser;
        try {
            const solutionsRef = collection(db, LEVELS_COLLECTION, levelId, "solutions");

            // We can store it as a simple doc
            await addDoc(solutionsRef, {
                solution,
                userId: user?.uid || 'anonymous',
                userName: user?.displayName || 'Anonymous',
                createdAt: Timestamp.now()
            });

            if (user) {
                await UserService.addClearedLevel(user.uid, levelId);
            }

            console.log("Solution submitted for", levelId);
        } catch (e) {
            console.error("Failed to submit solution", e);
        }
    }

    async getLevelSolutions(levelId: string, limitCount = 20): Promise<{ solution: string, userName: string, createdAt: number }[]> {
        try {
            const solutionsRef = collection(db, LEVELS_COLLECTION, levelId, "solutions");
            const q = query(
                solutionsRef,
                // orderBy("createdAt", "desc"), // Requires index? If consistent failure, remove orderBy or create index
                limit(limitCount)
            );

            // Note: If orderBy fails without index, we might just fetch and soft.
            // For now, let's try without strict orderBy or just accept it might require index creation.
            // Safest for MVP without index creation is just getDocs (it usually returns insertion order roughly or undefined).
            // Let's add orderBy in memory or try simple query.

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({
                solution: doc.data().solution,
                userName: doc.data().userName,
                createdAt: (doc.data().createdAt as Timestamp).toMillis()
            })).sort((a, b) => b.createdAt - a.createdAt); // Sort in memory
        } catch (e) {
            console.error("Failed to fetch solutions", e);
            return [];
        }
    }

    private mapDocToLevel(docSnapshot: any): LevelConfig {
        const data = docSnapshot.data() as FirestoreLevelData;
        const id = docSnapshot.id;

        let levelConfig: LevelConfig;
        try {
            levelConfig = JSON.parse(data.data);
        } catch {
            // Fallback if JSON is broken
            levelConfig = { ...data } as any;
        }

        // Overwrite metadata with Firestore truth
        levelConfig.id = id;
        levelConfig.name = data.title;
        levelConfig.description = data.description;
        levelConfig.difficulty = data.difficulty;
        levelConfig.authorId = data.authorId;
        levelConfig.authorName = data.authorName;
        levelConfig.isOfficial = data.tier === 'official';
        levelConfig.createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : Date.now();
        levelConfig.likes = data.likes;
        levelConfig.plays = data.plays;
        levelConfig.order = data.order;
        levelConfig.ratingTotal = data.ratingTotal;
        levelConfig.ratingCount = data.ratingCount;
        levelConfig.solution = data.solution || undefined; // Map solution

        return levelConfig;
    }
}

export const levelService = new FirebaseLevelService();
