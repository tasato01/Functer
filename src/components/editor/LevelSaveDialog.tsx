import React, { useState } from 'react';
import { audioService } from '../../services/AudioService';
interface LevelSaveDialogProps {
    isOpen: boolean;
    initialName: string;
    initialMemo?: string;
    initialDifficulty: string;
    onClose: () => void;
    onSave: (name: string, memo: string, difficulty: string, saveAsNew: boolean) => void;
}

export const LevelSaveDialog: React.FC<LevelSaveDialogProps> = ({ isOpen, initialName, initialMemo, initialDifficulty, onClose, onSave }) => {
    const [name, setName] = useState(initialName);
    const [memo, setMemo] = useState(initialMemo || '');
    const [difficulty, setDifficulty] = useState(initialDifficulty || 'A');

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

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-white mb-4">Save Level</h2>

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
                            <button onClick={handleOverwrite} className="px-3 py-2 bg-gray-700 text-white text-sm font-bold rounded hover:bg-gray-600 transition-colors">
                                Overwrite
                            </button>
                            <button onClick={handleSaveAsNew} className="px-3 py-2 bg-neon-blue text-black text-sm font-bold rounded hover:bg-white transition-colors">
                                Save New
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};
