import React, { useState, useEffect } from 'react';
import { audioService } from '../../services/AudioService';
import { LevelManager } from '../../utils/LevelManager';
import { Save, FilePlus, RefreshCw, HardDrive } from 'lucide-react';

interface LevelSaveDialogProps {
    isOpen: boolean;
    initialName: string;
    initialMemo?: string;
    initialDifficulty: string;
    onClose: () => void;
    onSave: (name: string, memo: string, difficulty: string, saveAsNew: boolean, slotId?: string) => void;
}

export const LevelSaveDialog: React.FC<LevelSaveDialogProps> = ({ isOpen, initialName, initialMemo, initialDifficulty, onClose, onSave }) => {
    const [name, setName] = useState(initialName);
    const [memo, setMemo] = useState(initialMemo || '');
    const [difficulty, setDifficulty] = useState(initialDifficulty || 'A');
    const [existingSlots, setExistingSlots] = useState<Record<string, { name: string, date: number }>>({});

    useEffect(() => {
        if (isOpen) {
            const all = LevelManager.loadAllFromLocalStorage();
            const slots: Record<string, { name: string, date: number }> = {};
            all.forEach(l => {
                if (l.id.startsWith('slot_')) {
                    slots[l.id] = { name: l.name, date: l.createdAt || Date.now() };
                }
            });
            setExistingSlots(slots);
            setName(initialName);
            setMemo(initialMemo || '');
            setDifficulty(initialDifficulty || 'A');
        }
    }, [isOpen, initialName, initialMemo, initialDifficulty]);

    if (!isOpen) return null;

    const handleOverwrite = (e: React.MouseEvent) => {
        e.preventDefault();
        audioService.playSE('save');
        onSave(name, memo, difficulty, false);
    };

    const handleSaveAsNew = (e: React.MouseEvent) => {
        e.preventDefault();
        audioService.playSE('save');
        onSave(name, memo, difficulty, true);
    };

    const handleSaveSlot = (e: React.MouseEvent, slotId: string) => {
        e.preventDefault();
        if (existingSlots[slotId]) {
            if (!confirm(`Overwrite ${slotId.replace('_', ' ')} "${existingSlots[slotId].name}"?`)) return;
        }
        audioService.playSE('save');
        onSave(name, memo, difficulty, false, slotId);
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Save className="text-neon-blue" /> Save Level
                </h2>

                <div className="space-y-4">
                    {/* Quick Slots */}
                    <div>
                        <label className="block text-xs text-gray-400 font-bold mb-2">QUICK SAVE SLOTS</label>
                        <div className="grid grid-cols-3 gap-2">
                            {['slot_1', 'slot_2', 'slot_3', 'slot_4', 'slot_5'].map(id => {
                                const info = existingSlots[id];
                                const slotNum = id.split('_')[1];
                                return (
                                    <button
                                        key={id}
                                        onClick={(e) => handleSaveSlot(e, id)}
                                        className={`p-2 rounded border text-left transition-all relative overflow-hidden group ${info ? 'bg-neon-blue/10 border-neon-blue/50 hover:bg-neon-blue/20' : 'bg-white/5 border-white/10 hover:bg-white/10 border-dashed'}`}
                                        title={info ? `Overwrite ${info.name}` : `Save to Slot ${slotNum}`}
                                    >
                                        <div className="text-[10px] font-bold text-gray-500 mb-1">SLOT {slotNum}</div>
                                        <div className={`text-xs font-bold truncate ${info ? 'text-white' : 'text-gray-600'}`}>
                                            {info ? info.name : 'Empty'}
                                        </div>
                                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <HardDrive size={10} className="text-neon-blue" />
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div className="border-t border-gray-700 my-4"></div>

                    {/* Standard Save Form */}
                    <form className="space-y-4">
                        <div>
                            <label className="block text-xs text-neon-blue font-bold mb-1">Stage Name</label>
                            <input
                                type="text"
                                className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white focus:border-neon-blue outline-none"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-neon-blue font-bold mb-1">Difficulty</label>
                            <select
                                className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white focus:border-neon-blue outline-none"
                                value={difficulty}
                                onChange={e => setDifficulty(e.target.value)}
                            >
                                <option value="A">A (Easy)</option>
                                <option value="B">B (Basic)</option>
                                <option value="C">C (Difficult)</option>
                                <option value="EX">EX (Expert)</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs text-gray-400 font-bold mb-1">Memo (Optional)</label>
                            <textarea
                                className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white h-20 resize-none focus:border-neon-blue outline-none"
                                value={memo}
                                onChange={e => setMemo(e.target.value)}
                            />
                        </div>

                        <div className="flex justify-between gap-2 pt-4 border-t border-gray-700 mt-4">
                            <button type="button" onClick={onClose} className="px-3 py-2 text-gray-400 hover:text-white text-sm">Cancel</button>
                            <div className="flex gap-2">
                                <button onClick={handleOverwrite} className="px-3 py-2 bg-gray-700 text-white text-sm font-bold rounded hover:bg-gray-600 transition-colors flex items-center gap-1" title="Update existing ID">
                                    <RefreshCw size={14} /> Update
                                </button>
                                <button onClick={handleSaveAsNew} className="px-3 py-2 bg-neon-blue text-black text-sm font-bold rounded hover:bg-white transition-colors flex items-center gap-1" title="Create new copy">
                                    <FilePlus size={14} /> Save New
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};
