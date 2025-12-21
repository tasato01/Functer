import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { LevelConfig } from '../../types/Level';
import { levelService } from '../../services/FirebaseLevelService';
import { audioService } from '../../services/AudioService';
import type { User } from 'firebase/auth';
import { ADMIN_UIDS } from '../../constants/admin';
import { AlertTriangle } from 'lucide-react';

interface LevelPublishDialogProps {
    isOpen: boolean;
    level: LevelConfig;
    user: User | null;
    solution: string | null; // Null means not cleared yet
    onClose: () => void;
}

export const LevelPublishDialog: React.FC<LevelPublishDialogProps> = ({ isOpen, level, user, solution, onClose }) => {
    const [name, setName] = useState(level.name || ''); // Default to level name
    const [description, setDescription] = useState(level.description || '');
    const [difficulty, setDifficulty] = useState(level.difficulty || 'A');
    const [hint, setHint] = useState(level.hint || '');
    const [authorAlias, setAuthorAlias] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isOfficial, setIsOfficial] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setName(level.name || '');
            setDescription(level.description || '');
            setDifficulty(level.difficulty || 'A');
            setHint(level.hint || '');

            // Allow changing official flag if admin
            setIsOfficial(level.isOfficial || false);

            // Load saved author alias or user name
            const savedAlias = localStorage.getItem('functer_author_name');
            if (savedAlias) {
                setAuthorAlias(savedAlias);
            } else if (user?.displayName) {
                setAuthorAlias(user.displayName);
            }
        }
    }, [isOpen, level, user]);

    const isAdmin = user && ADMIN_UIDS.includes(user.uid);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !solution) return;

        if (!name.trim()) {
            alert("Please enter a Stage Name.");
            return;
        }

        if (!confirm("Warning: This stage will be publicly visible to everyone.\nAre you sure you want to publish?")) {
            return;
        }

        setIsSubmitting(true);
        try {
            // Save alias for next time
            localStorage.setItem('functer_author_name', authorAlias);

            // Update level metadata before publishing
            const levelToPublish = {
                ...level,
                name,
                description,
                difficulty,
                hint,
                authorName: authorAlias, // Added author name from input
                isOfficial: isOfficial // Pass official flag
            };

            const success = await levelService.publishLevel(levelToPublish, solution);
            if (success) {
                audioService.playSE('save');
                alert("Level Published Successfully!");
                onClose();
            }
        } catch (error: any) {
            alert("Failed to publish: " + error.message);
        } finally {
            setIsSubmitting(false);
        }
    };


    return createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <h2 className="text-xl font-bold text-neon-purple mb-4">Publish Level</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
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
                        <label className="block text-xs text-neon-blue font-bold mb-1">Author Name (Alias)</label>
                        <input
                            type="text"
                            className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white focus:border-neon-blue outline-none"
                            value={authorAlias}
                            onChange={e => setAuthorAlias(e.target.value)}
                            placeholder="Your Name"
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
                            <option value="A">A (EASY)</option>
                            <option value="B">B (BASIC)</option>
                            <option value="C">C (DIFFICULT)</option>
                            <option value="EX">EX (EXPERT)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs text-neon-blue font-bold mb-1">Hint (Optional)</label>
                        <input
                            type="text"
                            className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white focus:border-neon-blue outline-none"
                            value={hint}
                            onChange={e => setHint(e.target.value)}
                            placeholder="e.g. Try using a sine wave..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-400 font-bold mb-1">Description</label>
                        <textarea
                            className="w-full bg-black/50 border border-gray-600 rounded p-2 text-white h-20 resize-none focus:border-neon-blue outline-none"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>

                    <div className="bg-red-500/10 border border-red-500/30 p-2 rounded mb-2">
                        <p className="text-red-400 text-[10px] font-bold flex items-center gap-2">
                            <AlertTriangle size={12} />
                            Warning: This stage will be publicly visible to everyone.
                        </p>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-2 pt-2 border-t border-gray-800/50 mt-2">
                            <input
                                type="checkbox"
                                id="isOfficial"
                                checked={isOfficial}
                                onChange={e => setIsOfficial(e.target.checked)}
                                className="w-4 h-4"
                            />
                            <label htmlFor="isOfficial" className="text-xs text-neon-yellow font-bold cursor-pointer">
                                Publish as Official Level
                            </label>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-2 border-t border-gray-800 mt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-400 hover:text-white" disabled={isSubmitting}>Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-neon-purple text-white font-bold rounded hover:bg-neon-purple/80 transition-colors disabled:opacity-50" disabled={isSubmitting}>
                            {isSubmitting ? 'Publishing...' : 'Publish'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};
