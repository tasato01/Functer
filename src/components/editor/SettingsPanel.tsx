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

                <div className="border-t border-white/10 my-3"></div>

                <h4 className="text-neon-pink text-xs font-bold mb-2">DISPLAY</h4>
                <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                        <span className="text-gray-300">Show Coordinates</span>
                        <input type="checkbox"
                            checked={level.showCoordinates !== false}
                            onChange={e => setLevel(l => ({ ...l, showCoordinates: e.target.checked }))}
                        />
                    </label>
                    <label className="flex items-center justify-between text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                        <span className="text-gray-300">Show Inequalities</span>
                        <input type="checkbox"
                            checked={level.showInequalities !== false}
                            onChange={e => setLevel(l => ({ ...l, showInequalities: e.target.checked }))}
                        />
                    </label>
                </div>

                <div className="border-t border-white/10 my-3"></div>

                <h4 className="text-neon-pink text-xs font-bold mb-2">VARIABLE 'a'</h4>
                <div className="space-y-2">
                    <label className="flex items-center justify-between text-sm cursor-pointer hover:bg-white/5 p-1 rounded">
                        <span className="text-gray-300">Use Variable 'a'</span>
                        <input type="checkbox"
                            checked={level.playerVar?.enabled || false}
                            onChange={e => setLevel(l => ({ ...l, playerVar: { ...l.playerVar, enabled: e.target.checked, speed: l.playerVar?.speed ?? 5 } }))}
                        />
                    </label>
                    {level.playerVar?.enabled && (
                        <div className="flex justify-between items-center text-sm pl-2 border-l-2 border-neon-blue/30">
                            <span className="text-gray-300">Change Speed</span>
                            <input type="number" step="0.5" className="w-16 bg-black/50 border border-white/20 rounded px-2 py-1 text-right"
                                value={level.playerVar.speed}
                                onChange={e => setLevel(l => ({ ...l, playerVar: { ...l.playerVar!, speed: Number(e.target.value) } }))}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
