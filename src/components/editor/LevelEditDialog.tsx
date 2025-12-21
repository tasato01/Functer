import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import type { LevelConfig } from '../../types/Level';
import { levelService } from '../../services/FirebaseLevelService';
import { audioService } from '../../services/AudioService';

interface LevelEditDialogProps {
    isOpen: boolean;
    onClose: () => void;
    level: LevelConfig | null;
    onSave: () => void;
}

export const LevelEditDialog: React.FC<LevelEditDialogProps> = ({ isOpen, onClose, level, onSave }) => {
    const [name, setName] = useState('');
    const [difficulty, setDifficulty] = useState('A');
    const [description, setDescription] = useState('');
    const [hint, setHint] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (level && isOpen) {
            setName(level.name);
            setDifficulty(level.difficulty || 'A');
            setDescription(level.description || '');
            setHint(level.hint || '');
        }
    }, [level, isOpen]);

    if (!isOpen || !level) return null;

    const handleSave = async () => {
        if (!name.trim()) {
            alert("Name is required");
            return;
        }
        setLoading(true);
        const success = await levelService.updateLevel(level.id, {
            name,
            difficulty,
            description,
            hint
        });
        setLoading(false);
        if (success) {
            audioService.playSE('save');
            onSave();
            onClose();
        } else {
            alert("Failed to update level.");
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-neon-blue rounded-xl w-full max-w-md shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                        EDIT STAGE INFO
                    </h2>
                    <button onClick={() => { audioService.playSE('click'); onClose(); }} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4">
                    {/* Name */}
                    <div>
                        <label className="block text-neon-blue text-xs font-bold mb-1">STAGE NAME</label>
                        <input
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-neon-blue outline-none transition-colors"
                            placeholder="My Awesome Level"
                        />
                    </div>

                    {/* Difficulty */}
                    <div>
                        <label className="block text-neon-blue text-xs font-bold mb-1">DIFFICULTY</label>
                        <select
                            value={difficulty}
                            onChange={(e) => { audioService.playSE('click'); setDifficulty(e.target.value); }}
                            className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-neon-blue outline-none transition-colors"
                        >
                            <option value="A">A (EASY)</option>
                            <option value="B">B (BASIC)</option>
                            <option value="C">C (DIFFICULT)</option>
                            <option value="EX">EX (EXPERT)</option>
                        </select>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-neon-blue text-xs font-bold mb-1">DESCRIPTION</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-neon-blue outline-none transition-colors h-24"
                            placeholder="Describe your stage..."
                        />
                    </div>

                    {/* Hint */}
                    <div>
                        <label className="block text-neon-blue text-xs font-bold mb-1">HINT (Optional)</label>
                        <textarea
                            value={hint}
                            onChange={e => setHint(e.target.value)}
                            className="w-full bg-black border border-gray-700 rounded p-2 text-white focus:border-neon-blue outline-none transition-colors h-16"
                            placeholder="Give players a clue..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-800 flex justify-end gap-3">
                    <button
                        onClick={() => { audioService.playSE('click'); onClose(); }}
                        className="px-4 py-2 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition-colors font-bold"
                    >
                        CANCEL
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="px-6 py-2 rounded bg-neon-blue text-black font-bold hover:bg-neon-blue/90 hover:scale-105 transition-all shadow-[0_0_15px_#00ffff]"
                    >
                        {loading ? 'SAVING...' : 'SAVE CHANGES'}
                    </button>
                </div>
            </div>
        </div>
    );
};
