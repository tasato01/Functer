import type { LevelConfig } from '../types/Level';

export interface ILevelService {
    /**
     * Get list of official levels curated by the game developers
     * @param forceRefresh Ignore cache and fetch fresh data
     */
    getOfficialLevels(forceRefresh?: boolean): Promise<LevelConfig[]>;

    /**
     * Get list of user-created levels
     * @param options Filter and sort options
     * @param forceRefresh Ignore cache and fetch fresh data
     */
    getUserLevels(options?: { authorId?: string, sort?: 'newest' | 'oldest' | 'likes' | 'rating' | 'plays' }, forceRefresh?: boolean): Promise<LevelConfig[]>;

    /**
     * Get a specific level by ID
     * @param id Level ID
     */
    getLevelById(id: string): Promise<LevelConfig | null>;

    /**
     * Publish a level to the server (mock or real)
     * @param level The level configuration to publish
     */
    publishLevel(level: LevelConfig, solution?: string): Promise<boolean>;

    /**
     * Delete a level (Admin or Author only)
     * @param id Level ID
     */
    deleteLevel(id: string): Promise<boolean>;
    updateLevel(id: string, updates: Partial<LevelConfig>): Promise<boolean>;

    // --- Interaction Methods ---
    incrementPlayCount(id: string): Promise<void>;
    likeLevel(id: string): Promise<boolean>;
    rateLevel(id: string, rating: number): Promise<boolean>;
    updateLevelOrder(levels: LevelConfig[]): Promise<boolean>;
}
