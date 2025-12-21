import { DEFAULT_LEVEL } from '../types/Level';
import type { LevelConfig } from '../types/Level';

const STORAGE_KEY = 'functer_user_levels';

export const LevelManager = {
    // Export to JSON File
    exportToJSON: (level: LevelConfig) => {
        const data = JSON.stringify(level, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${level.name.replace(/\s+/g, '_')}_${level.id}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Import from JSON String
    parseJSON: (jsonStr: string): LevelConfig | null => {
        try {
            const data = JSON.parse(jsonStr);
            // Basic validation check
            if (!data.id || !data.startPoint || !data.goalPoint) {
                console.error("Invalid Level Data: Missing required fields");
                return null;
            }
            // Merge with default to ensure structural integrity
            return {
                ...DEFAULT_LEVEL,
                ...data,
                // Deep merge constraints/shapes/waypoints if necessary, but spread handles top-level well.
                // We should ensure arrays are arrays.
                constraints: Array.isArray(data.constraints) ? data.constraints : [],
                shapes: Array.isArray(data.shapes) ? data.shapes : [],
                waypoints: Array.isArray(data.waypoints) ? data.waypoints : [],
            };
        } catch (e) {
            console.error("Failed to parse JSON", e);
            return null;
        }
    },

    // Local Storage Management
    saveToLocalStorage: (level: LevelConfig) => {
        try {
            const existingStr = localStorage.getItem(STORAGE_KEY);
            let levels: LevelConfig[] = existingStr ? JSON.parse(existingStr) : [];

            // Update or Append
            const idx = levels.findIndex(l => l.id === level.id);
            if (idx >= 0) {
                levels[idx] = level;
            } else {
                levels.push(level);
            }

            localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
            console.log('Saved to Storage. Total levels:', levels.length); // DEBUG
            return true;
        } catch (e) {
            console.error("LocalStorage Save Failed", e);
            return false;
        }
    },

    loadAllFromLocalStorage: (): LevelConfig[] => {
        try {
            const str = localStorage.getItem(STORAGE_KEY);
            console.log('Loading from Storage:', str); // DEBUG
            return str ? JSON.parse(str) : [];
        } catch (e) {
            console.error("Load Failed:", e);
            return [];
        }
    },

    deleteFromLocalStorage: (id: string) => {
        try {
            const existingStr = localStorage.getItem(STORAGE_KEY);
            if (!existingStr) return;
            let levels: LevelConfig[] = JSON.parse(existingStr);
            levels = levels.filter(l => l.id !== id);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(levels));
        } catch (e) {
            console.error("LocalStorage Delete Failed", e);
        }
    }
};
