import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Trash2 } from 'lucide-react';
import { levelService } from '../../services/FirebaseLevelService';
import { audioService } from '../../services/AudioService';
import { auth } from '../../services/firebase'; // Import auth
import { ADMIN_UIDS } from '../../constants/admin'; // Import admin list

// Ensure MathField is available
declare global {
    namespace JSX {
        interface IntrinsicElements {
            'math-field': any;
        }
    }
}

interface SolutionDisplayDialogProps {
    isOpen: boolean;
    onClose: () => void;
    levelId: string;
    levelSolution?: string; // Official solution
}

export const SolutionDisplayDialog: React.FC<SolutionDisplayDialogProps> = ({ isOpen, onClose, levelId, levelSolution }) => {
    const [solutions, setSolutions] = useState<{ id: string; solution: string; userName: string; createdAt: number }[]>([]);
    const [loading, setLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState<string | null>(null);

    const isAdmin = auth.currentUser && ADMIN_UIDS.includes(auth.currentUser.uid);

    useEffect(() => {
        let active = true;
        if (isOpen && levelId) {
            setSolutions([]); // Clear old data
            setLoading(true);
            levelService.getLevelSolutions(levelId).then(data => {
                if (active) {
                    setSolutions(data);
                    setLoading(false);
                }
            });
        }
        return () => { active = false; };
    }, [isOpen, levelId]);

    const copyToClipboard = (text: string, index: string) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        audioService.playSE('click');
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleDelete = async (solutionId: string) => {
        if (!confirm("Are you sure you want to delete this solution?")) return;

        const success = await levelService.deleteSolution(levelId, solutionId);
        if (success) {
            setSolutions(prev => prev.filter(s => s.id !== solutionId));
            audioService.playSE('click');
        } else {
            alert("Failed to delete solution.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-neon-purple rounded-xl w-full max-w-lg shadow-[0_0_30px_rgba(180,0,255,0.3)] flex flex-col max-h-[85vh]">
                <div className="flex justify-between items-center p-4 border-b border-white/10">
                    <h2 className="text-xl font-bold text-neon-purple tracking-widest">SOLUTIONS</h2>
                    <button onClick={() => { audioService.playSE('click'); onClose(); }} className="text-gray-400 hover:text-white">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1 space-y-6">
                    {/* Official Solution */}
                    {levelSolution && (
                        <div className="bg-neon-purple/5 border border-neon-purple/20 rounded-lg p-3">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-neon-purple uppercase">Official Answer</span>
                            </div>
                            <div className="relative group">
                                {(() => {
                                    const MathFieldTag = 'math-field' as any;
                                    return (
                                        <MathFieldTag
                                            read-only
                                            style={{
                                                display: 'block',
                                                backgroundColor: 'transparent',
                                                color: '#e879f9',
                                                fontSize: '1.2em',
                                                padding: '8px',
                                                border: 'none',
                                                width: '100%'
                                            }}
                                        >
                                            {levelSolution}
                                        </MathFieldTag>
                                    );
                                })()}
                                <button
                                    onClick={() => copyToClipboard(levelSolution, 'official')}
                                    className="absolute top-1/2 -translate-y-1/2 right-2 p-2 bg-black/50 rounded-full hover:bg-neon-purple text-white opacity-0 group-hover:opacity-100 transition-all"
                                    title="Copy LaTeX"
                                >
                                    {copiedIndex === 'official' ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Community Solutions */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-400 mb-3 flex items-center gap-2">
                            Community Answers <span className="text-xs font-normal opacity-50">({solutions.length})</span>
                        </h3>

                        {loading ? (
                            <div className="text-center py-8 text-gray-500 animate-pulse">Loading solutions...</div>
                        ) : solutions.length === 0 ? (
                            <div className="text-center py-8 text-gray-600 italic">No community solutions yet. Be the first!</div>
                        ) : (
                            <div className="space-y-3">
                                {solutions.map((item, idx) => (
                                    <div key={item.id || idx} className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
                                        <div className="flex justify-between items-center mb-1">
                                            <div className="flex flex-col">
                                                <span className="text-xs text-gray-400 font-bold">{item.userName}</span>
                                                <span className="text-[10px] text-gray-600">{new Date(item.createdAt).toLocaleDateString()}</span>
                                            </div>

                                            <div className="flex gap-2">
                                                {/* Admin Delete Button */}
                                                {isAdmin && (
                                                    <button
                                                        onClick={() => handleDelete(item.id)}
                                                        className="text-gray-600 hover:text-red-500 transition-colors p-1"
                                                        title="Delete (Admin)"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="relative group">
                                            {(() => {
                                                const MathFieldTag = 'math-field' as any;
                                                return (
                                                    <MathFieldTag
                                                        read-only
                                                        style={{
                                                            display: 'block',
                                                            backgroundColor: 'transparent',
                                                            color: '#fff',
                                                            fontSize: '1.0em',
                                                            padding: '4px',
                                                            border: 'none',
                                                            width: '100%'
                                                        }}
                                                    >
                                                        {item.solution}
                                                    </MathFieldTag>
                                                );
                                            })()}
                                            <button
                                                onClick={() => copyToClipboard(item.solution, `c_${idx}`)}
                                                className="absolute top-1/2 -translate-y-1/2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-neon-blue text-white opacity-0 group-hover:opacity-100 transition-all"
                                                title="Copy LaTeX"
                                            >
                                                {copiedIndex === `c_${idx}` ? <Check size={14} /> : <Copy size={14} />}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
