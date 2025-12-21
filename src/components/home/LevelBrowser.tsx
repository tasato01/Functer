import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { levelService } from '../../services/FirebaseLevelService';
import { audioService } from '../../services/AudioService';
import { auth } from '../../services/firebase';
import { ADMIN_UIDS } from '../../constants/admin';
import { Play, ChevronLeft, User, Clock, Heart, RefreshCw, Trash2, ShieldCheck, PenSquare, Copy, Save } from 'lucide-react';
import { StageThumbnail } from './StageThumbnail';
import { LevelEditDialog } from '../editor/LevelEditDialog';
import type { LevelConfig } from '../../types/Level';

export const LevelBrowser: React.FC<{ type: 'official' | 'user' | 'mine' | 'author' }> = ({ type }) => {
    const navigate = useNavigate();
    const { authorId } = useParams();
    const [levels, setLevels] = useState<LevelConfig[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState(auth.currentUser);
    const [sort, setSort] = useState<'newest' | 'oldest' | 'likes' | 'rating' | 'plays'>('newest');

    // Admin DnD State
    const [dragSourceIndex, setDragSourceIndex] = useState<number | null>(null);
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [editingLevel, setEditingLevel] = useState<LevelConfig | null>(null);

    const isAdmin = currentUser && ADMIN_UIDS.includes(currentUser.uid);

    const fetchLevels = async (force = false) => {
        setLoading(true);
        setHasUnsavedChanges(false);
        try {
            if (type === 'official') {
                const data = await levelService.getOfficialLevels(force);
                setLevels(data);
            } else if (type === 'mine') {
                if (!currentUser) {
                    navigate('/');
                    return;
                }
                const data = await levelService.getUserLevels({ authorId: currentUser.uid, sort }, force);
                setLevels(data);
            } else if (type === 'author' && authorId) {
                const data = await levelService.getUserLevels({ authorId, sort }, force);
                setLevels(data);
            } else {
                const data = await levelService.getUserLevels({ sort }, force);
                setLevels(data);
            }
        } catch (error) {
            console.error("Failed to load levels", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLevels();
        const unsub = auth.onAuthStateChanged(u => setCurrentUser(u));
        return () => unsub();
    }, [type, sort]);

    const handleDelete = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        const success = await levelService.deleteLevel(id);
        if (success) {
            fetchLevels(true);
        }
    };

    // DnD Handlers
    const handleDragStart = (e: React.DragEvent, index: number) => {
        setDragSourceIndex(index);
        e.dataTransfer.effectAllowed = "move";
    };

    const handleDragOver = (e: React.DragEvent, _index: number) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    };

    const handleDrop = (e: React.DragEvent, dropIndex: number) => {
        e.preventDefault();
        if (dragSourceIndex === null || dragSourceIndex === dropIndex) return;

        const newLevels = [...levels];
        const [removed] = newLevels.splice(dragSourceIndex, 1);
        newLevels.splice(dropIndex, 0, removed);

        setLevels(newLevels);
        setHasUnsavedChanges(true);
        setDragSourceIndex(null);
    };

    const handleSaveOrder = async () => {
        if (!confirm("Save new order for Official Levels?")) return;
        setLoading(true);
        const success = await levelService.updateLevelOrder(levels);
        setLoading(false);
        if (success) {
            setHasUnsavedChanges(false);
            alert("Order saved!");
        } else {
            alert("Failed to save order.");
        }
    };

    return (
        <div className="flex flex-col h-full bg-black text-white p-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between mb-8 shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => { audioService.playSE('click'); navigate('/'); }}
                        className="p-2 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink">
                        {type === 'official' ? 'OFFICIAL STAGES' :
                            type === 'mine' ? 'MY STAGES' :
                                type === 'author' ? 'CREATOR' : 'COMMUNITY STAGES'}
                    </h2>
                    {isAdmin && (
                        <div className="ml-4 flex items-center gap-1 bg-red-900/80 text-red-200 text-[10px] px-2 py-1 rounded font-bold border border-red-500/30 select-none">
                            <ShieldCheck size={12} /> ADMIN
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4">
                    {/* Save Order Button for Admin Official */}
                    {isAdmin && type === 'official' && hasUnsavedChanges && (
                        <button
                            onClick={handleSaveOrder}
                            className="flex items-center gap-2 bg-neon-green/20 border border-neon-green text-neon-green px-3 py-1 rounded hover:bg-neon-green/30 transition-all font-bold animate-pulse"
                        >
                            <Save size={16} /> SAVE ORDER
                        </button>
                    )}

                    {/* Sort Dropdown (Not for Official) */}
                    {type !== 'official' && (
                        <div className="relative">
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as any)}
                                className="bg-gray-900 border border-white/20 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-neon-blue appearance-none pr-8 cursor-pointer"
                            >
                                <option value="newest">Newest</option>
                                <option value="oldest">Oldest</option>
                                <option value="likes">Most Likes</option>
                                <option value="rating">Highest Rating</option>
                                <option value="plays">Most Plays</option>
                            </select>
                            {/* Custom Arrow */}
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </div>
                    )}

                    <button
                        onClick={() => { audioService.playSE('click'); fetchLevels(true); }}
                        className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
                        title="Refresh List"
                        disabled={loading}
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto flex flex-col gap-4 pr-2 pb-20 max-w-4xl mx-auto w-full">
                {loading && levels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4">
                        <div className="w-12 h-12 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
                        <div className="text-neon-blue font-bold animate-pulse">LOADING...</div>
                    </div>
                ) : (
                    <>
                        {levels.map((level, index) => {
                            const isDraggable = !!isAdmin && type === 'official';
                            return (
                                <div
                                    key={level.id}
                                    draggable={isDraggable}
                                    onDragStart={(e) => isDraggable && handleDragStart(e, index)}
                                    onDragOver={(e) => isDraggable && handleDragOver(e, index)}
                                    onDrop={(e) => isDraggable && handleDrop(e, index)}
                                    onClick={() => { audioService.playSE('click'); navigate(`/play/${level.id}`, { state: { from: type, sortContext: sort, listContextIds: levels.map(l => l.id) } }); }}
                                    className={`group bg-gray-900/50 border border-white/10 rounded-xl p-4 cursor-pointer hover:bg-white/5 hover:border-neon-pink/50 transition-all duration-300 relative ${isDraggable ? 'cursor-move' : ''} ${dragSourceIndex === index ? 'opacity-30 border-dashed border-white/50' : ''}`}
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/0 to-neon-pink/0 group-hover:from-neon-pink/5 group-hover:to-transparent transition-all duration-500"></div>

                                    <div className="flex gap-4 mb-2">
                                        {/* Thumbnail */}
                                        <div className="shrink-0 w-[120px] h-[90px] rounded-lg overflow-hidden border border-gray-700 bg-black">
                                            <StageThumbnail level={level} width={120} height={90} />
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start mb-1 gap-2">
                                                <h3 className="text-xl font-bold group-hover:text-neon-pink transition-colors break-words truncate pr-8">
                                                    {level.name}
                                                </h3>
                                                <div className="flex gap-2 shrink-0">
                                                    {/* Difficulty Badge */}
                                                    <span className={`px-2 py-0.5 rounded text-xs font-black border ${level.difficulty === 'EX' ? 'bg-purple-900/50 text-purple-200 border-purple-500' :
                                                        level.difficulty === 'C' ? 'bg-orange-900/50 text-orange-200 border-orange-500' :
                                                            level.difficulty === 'B' ? 'bg-blue-900/50 text-blue-200 border-blue-500' :
                                                                level.difficulty === 'A' ? 'bg-green-900/50 text-green-200 border-green-500' :
                                                                    'bg-gray-800 text-gray-300 border-gray-600'
                                                        } `} title={
                                                            level.difficulty === 'EX' ? 'EXPERT' :
                                                                level.difficulty === 'C' ? 'DIFFICULT' :
                                                                    level.difficulty === 'B' ? 'BASIC' :
                                                                        level.difficulty === 'A' ? 'EASY' : 'UNKNOWN'
                                                        }>
                                                        {level.difficulty || '?'}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex gap-4 mb-2">
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Heart size={12} /> {level.likes || 0}
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                    <Play size={12} /> {level.plays || 0}
                                                </div>
                                            </div>

                                            <p className="text-gray-400 text-sm break-words line-clamp-2">{level.description}</p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end">
                                        <div className="flex items-center gap-3 text-xs text-gray-600">
                                            {(type !== 'official' || isAdmin) && level.authorName && (
                                                <span
                                                    className="flex items-center gap-1 hover:text-neon-blue cursor-pointer z-20"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        audioService.playSE('click');
                                                        if (level.authorId) navigate(`/user/${level.authorId}`);
                                                    }}
                                                >
                                                    <User size={12} /> {level.authorName}
                                                </span>
                                            )}
                                            {level.createdAt && (
                                                <span className="flex items-center gap-1">
                                                    <Clock size={12} /> {new Date(level.createdAt).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>

                                        <span className="flex items-center gap-2 text-xs font-bold text-gray-500 group-hover:text-white transition-colors">
                                            PLAY <Play size={12} />
                                        </span>
                                    </div>

                                    {/* Action Buttons Container */}
                                    <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20">
                                        {/* Copy/Fork Button (Admin or Owner) */}
                                        {(isAdmin || type === 'mine') && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (confirm("Copy this level to Editor?")) {
                                                        navigate('/edit', { state: { initialLevel: level } });
                                                    }
                                                }}
                                                className="p-2 bg-green-900/80 rounded hover:bg-green-700 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                                title="Copy to Editor"
                                            >
                                                <Copy size={14} className="text-white" />
                                            </button>
                                        )}

                                        {/* Edit Button for My Levels OR Admin */}
                                        {(type === 'mine' || (isAdmin && type === 'official')) && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingLevel(level);
                                                }}
                                                className="p-2 bg-neon-blue/80 rounded hover:bg-neon-blue/60 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                                title="Edit Info"
                                            >
                                                <PenSquare size={14} className="text-white" />
                                            </button>
                                        )}

                                        {/* Delete Button (Admin or Owner) */}
                                        {(isAdmin || type === 'mine') && (
                                            <button
                                                onClick={(e) => handleDelete(e, level.id)}
                                                className="p-2 bg-red-900/80 rounded hover:bg-red-700 transition-all shadow-[0_0_10px_rgba(0,0,0,0.5)]"
                                                title="Delete Level"
                                            >
                                                <Trash2 size={14} className="text-white" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        {/* Coming Soon Placeholders only for Official */}
                        {type === 'official' && [...Array(3)].map((_, i) => (
                            <div key={`locked_${i} `} className="bg-gray-900/20 border border-white/5 rounded-xl p-4 flex items-center justify-center opacity-50">
                                <span className="text-gray-600 font-mono text-sm">LOCKED</span>
                            </div>
                        ))}
                    </>
                )}
            </div>

            {/* Edit Dialog */}
            <LevelEditDialog
                isOpen={!!editingLevel}
                onClose={() => setEditingLevel(null)}
                level={editingLevel}
                onSave={() => fetchLevels(true)}
            />
        </div >
    );
};
