import React from 'react';
import { Settings } from 'lucide-react';
import type { LevelConfig } from '../../types/Level';

interface SettingsPanelProps {
    snapStep: number;
    setSnapStep: (v: number) => void;
    level: LevelConfig;
    setLevel: React.Dispatch<React.SetStateAction<LevelConfig>>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
    snapStep,
    setSnapStep,
    level,
    setLevel
}) => {
    return (
        <div className="bg-black/80 border border-neon-blue rounded p-4 mb-4 animate-in fade-in slide-in-from-top-2">
            <h3 className="font-bold text-neon-blue mb-2 flex items-center gap-2"><Settings size={14} /> Settings</h3>
            <div className="space-y-3">
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Snap Step</span>
                    <input type="number" step="0.1" className="w-20 bg-black/50 border border-white/20 rounded px-2 py-1 text-right"
                        value={snapStep} onChange={e => setSnapStep(Number(e.target.value))} />
                </div>
                <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-300">Player Speed</span>
                    <input type="number" step="0.1" className="w-20 bg-black/50 border border-white/20 rounded px-2 py-1 text-right"
                        value={level.playerSpeed ?? 1.0} onChange={e => setLevel(l => ({ ...l, playerSpeed: Number(e.target.value) }))} />
                </div>
            </div>
        </div>
    );
};
