import type { ILevelService } from './LevelService';
import { DEFAULT_LEVEL } from '../types/Level';
import type { LevelConfig } from '../types/Level';

// Temporary hardcoded data moved from LevelBrowser
const MOCK_OFFICIAL_LEVELS: LevelConfig[] = [
    {
        ...DEFAULT_LEVEL,
        id: 'level_001',
        name: '001: Hello Sine',
        difficulty: '1',
        description: 'Basic introduction to sine waves.',
        isOfficial: true,
        authorName: 'Functer Team',
        likes: 120,
        plays: 500
    },
    {
        ...DEFAULT_LEVEL,
        id: 'level_002',
        name: '002: Parabola Jump',
        difficulty: '2',
        description: 'Crossing the gap using quadratics.',
        g_raw: 'x^2',
        isOfficial: true,
        authorName: 'Functer Team',
        likes: 85,
        plays: 320
    },
    {
        ...DEFAULT_LEVEL,
        id: 'level_003',
        name: '003: Step Function',
        difficulty: '3',
        description: 'Navigating discontinuous paths.',
        isOfficial: true,
        authorName: 'Functer Team',
        likes: 45,
        plays: 150
    },
    {
        ...DEFAULT_LEVEL,
        id: 'level_004',
        name: '004: Tangent Tunnel',
        difficulty: '4',
        description: 'Precise oscillation needed.',
        isOfficial: true,
        authorName: 'Functer Team',
        likes: 200,
        plays: 800
    },
];

const MOCK_USER_LEVELS: LevelConfig[] = [
    {
        ...DEFAULT_LEVEL,
        id: 'user_001',
        name: 'Super Hard Challenge',
        difficulty: '5',
        description: 'Only for experts! Good luck.',
        authorName: 'MathWizard99',
        isOfficial: false,
        likes: 10,
        plays: 55,
        createdAt: Date.now() - 10000000
    },
    {
        ...DEFAULT_LEVEL,
        id: 'user_002',
        name: 'Easy Peasy',
        difficulty: '1',
        description: 'Just a relax ride.',
        authorName: 'ChillGamer',
        isOfficial: false,
        likes: 5,
        plays: 20,
        createdAt: Date.now() - 5000000
    }
];

export class MockLevelService implements ILevelService {
    private officialCache: LevelConfig[] | null = null;
    private userCache: LevelConfig[] | null = null;

    async getOfficialLevels(forceRefresh = false): Promise<LevelConfig[]> {
        if (!forceRefresh && this.officialCache) {
            return [...this.officialCache];
        }
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        this.officialCache = [...MOCK_OFFICIAL_LEVELS];
        return [...this.officialCache];
    }

    async getUserLevels(options?: { authorId?: string, sort?: 'newest' | 'oldest' | 'likes' | 'rating' | 'plays' }, forceRefresh = false): Promise<LevelConfig[]> {
        if (!forceRefresh && this.userCache) {
            return this.applySort([...this.userCache], options?.sort);
        }
        await new Promise(resolve => setTimeout(resolve, 800));
        this.userCache = [...MOCK_USER_LEVELS];
        return this.applySort([...this.userCache], options?.sort);
    }

    private applySort(levels: LevelConfig[], sort?: string): LevelConfig[] {
        return levels.sort((a, b) => {
            switch (sort) {
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
    }

    async getLevelById(id: string): Promise<LevelConfig | null> {
        await new Promise(resolve => setTimeout(resolve, 300));
        const all = [...MOCK_OFFICIAL_LEVELS, ...MOCK_USER_LEVELS];
        return all.find(l => l.id === id) || null;
    }

    async publishLevel(level: LevelConfig): Promise<boolean> {
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('Mock Publish:', level);
        MOCK_USER_LEVELS.unshift({
            ...level,
            id: `user_${Date.now()}`, // fake new ID
            isOfficial: false,
            createdAt: Date.now(),
            likes: 0,
            plays: 0
        });
        return true;
    }
    async updateLevelOrder(levels: LevelConfig[]): Promise<boolean> {
        console.log("Mock updateLevelOrder", levels);
        return true;
    }

    async incrementPlayCount(id: string): Promise<void> {
        console.log("Mock incrementPlayCount", id);
        const l = await this.getLevelById(id);
        if (l) l.plays = (l.plays || 0) + 1;
    }

    async likeLevel(id: string): Promise<boolean> {
        console.log("Mock likeLevel", id);
        const l = await this.getLevelById(id);
        if (l) l.likes = (l.likes || 0) + 1;
        return true;
    }

    async rateLevel(id: string, rating: number): Promise<boolean> {
        console.log("Mock rateLevel", id, rating);
        const l = await this.getLevelById(id);
        if (l) {
            l.ratingTotal = (l.ratingTotal || 0) + rating;
            l.ratingCount = (l.ratingCount || 0) + 1;
        }
        return true;
    }

    async deleteLevel(id: string): Promise<boolean> {
        console.log("Mock delete", id);
        const idx = MOCK_USER_LEVELS.findIndex(l => l.id === id);
        if (idx !== -1) {
            MOCK_USER_LEVELS.splice(idx, 1);
            return true;
        }
        return false;
    }
}

export const levelService = new MockLevelService();
