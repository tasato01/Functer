import React, { useState, useEffect } from 'react';
import { X, Bell } from 'lucide-react';
import { AnnouncementService, type Announcement } from '../../services/AnnouncementService';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface AnnouncementDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AnnouncementDialog: React.FC<AnnouncementDialogProps> = ({ isOpen, onClose }) => {
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [loading, setLoading] = useState(true);
    const [readIds, setReadIds] = useState<Set<string>>(new Set());
    const [selectedId, setSelectedId] = useState<string | null>(null);

    // Load Read Status from LocalStorage
    useEffect(() => {
        const stored = localStorage.getItem('functer_read_announcements');
        if (stored) {
            setReadIds(new Set(JSON.parse(stored)));
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            setLoading(true);
            AnnouncementService.getAllAnnouncements().then(data => {
                setAnnouncements(data);
                setLoading(false);
            });
        } else {
            setSelectedId(null); // Reset selection on close
        }
    }, [isOpen]);

    const handleSelect = (announcement: Announcement) => {
        setSelectedId(announcement.id);
        // Mark as read
        if (!readIds.has(announcement.id)) {
            const newRead = new Set(readIds);
            newRead.add(announcement.id);
            setReadIds(newRead);
            localStorage.setItem('functer_read_announcements', JSON.stringify(Array.from(newRead)));
        }
    };

    const selectedAnnouncement = announcements.find(a => a.id === selectedId);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-neon-blue/50 rounded-2xl w-full max-w-7xl h-[85vh] shadow-2xl flex flex-col overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-black/20">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 italic tracking-wider">
                        <Bell className="text-neon-blue" /> NEWS
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* Content Area - Split View */}
                <div className="flex-1 flex overflow-hidden">

                    {/* Left Pane: List - 30% width (or 100% on mobile if selected) */}
                    <div className={`${selectedId ? 'hidden md:flex md:w-[30%]' : 'w-full'} flex-col border-r border-white/10 bg-black/20`}>
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {loading ? (
                                <div className="text-center text-gray-500 py-10">Loading...</div>
                            ) : announcements.length === 0 ? (
                                <div className="text-center text-gray-500 py-10">No announcements yet.</div>
                            ) : (
                                announcements.map(item => {
                                    const isNew = !readIds.has(item.id);
                                    const isSelected = selectedId === item.id;
                                    return (
                                        <button
                                            key={item.id}
                                            onClick={() => handleSelect(item)}
                                            className={`w-full text-left p-3 rounded-lg border transition-all duration-200 group
                                                ${isSelected
                                                    ? 'bg-neon-blue/10 border-neon-blue'
                                                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/20'
                                                }
                                            `}
                                        >
                                            <div className="flex items-center gap-2 mb-1">
                                                {isNew && (
                                                    <span className="bg-neon-pink text-white text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                                                        NEW
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-mono opacity-70 ${item.type === 'important' ? 'text-red-400' :
                                                    item.type === 'maintenance' ? 'text-orange-400' :
                                                        item.type === 'update' ? 'text-neon-green' : 'text-neon-blue'
                                                    }`}>
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className={`font-bold text-sm truncate ${isSelected ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                                                {item.title}
                                            </h3>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Right Pane: Content - 70% width */}
                    <div className={`${!selectedId ? 'hidden md:flex md:w-[70%]' : 'flex w-full md:w-[70%]'} flex-col bg-[#1a1b1e]`}>
                        {selectedAnnouncement ? (
                            <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-4 duration-300">
                                {/* Mobile Back Button */}
                                <div className="md:hidden p-2 border-b border-white/10">
                                    <button onClick={() => setSelectedId(null)} className="text-neon-blue text-sm font-bold flex items-center gap-1">
                                        &larr; Back to List
                                    </button>
                                </div>

                                <div className="p-8 overflow-y-auto">
                                    <div className="mb-6 border-b border-white/10 pb-4">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${selectedAnnouncement.type === 'important' ? 'border-red-500 text-red-500' :
                                                selectedAnnouncement.type === 'maintenance' ? 'border-orange-500 text-orange-500' :
                                                    selectedAnnouncement.type === 'update' ? 'border-neon-green text-neon-green' : 'border-neon-blue text-neon-blue'
                                                }`}>
                                                {selectedAnnouncement.type.toUpperCase()}
                                            </span>
                                            <span className="text-sm text-gray-400 font-mono">
                                                {new Date(selectedAnnouncement.createdAt).toLocaleDateString()}
                                            </span>
                                        </div>
                                        <h1 className="text-3xl font-bold text-white leading-tight">
                                            {selectedAnnouncement.title}
                                        </h1>
                                    </div>

                                    <div className="prose prose-invert prose-p:text-gray-300 prose-headings:text-white prose-a:text-neon-blue max-w-none">
                                        <ReactMarkdown
                                            remarkPlugins={[remarkMath]}
                                            rehypePlugins={[rehypeKatex]}
                                            components={{
                                                // Customize markdown rendering for better readability
                                                h1: ({ node, ...props }) => <h2 className="text-2xl font-bold mt-6 mb-4 border-l-4 border-neon-blue pl-3" {...props} />,
                                                h2: ({ node, ...props }) => <h3 className="text-xl font-bold mt-5 mb-3 text-neon-blue" {...props} />,
                                                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed text-gray-200" {...props} />,
                                                li: ({ node, ...props }) => <li className="mb-1 text-gray-200" {...props} />,
                                                code: ({ node, ...props }) => <code className="bg-black/50 rounded px-1 text-neon-pink font-mono text-sm" {...props} />,
                                                pre: ({ node, ...props }) => <pre className="bg-black/50 rounded p-4 mb-4 overflow-x-auto border border-white/10" {...props} />,
                                                blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-500 pl-4 py-1 italic text-gray-400 bg-white/5 my-4 rounded-r" {...props} />,
                                            }}
                                        >
                                            {selectedAnnouncement.message}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-gray-600 space-y-4">
                                <Bell size={48} className="opacity-20" />
                                <p>Select an announcement to view details.</p>
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};
