import React, { useState, useEffect } from 'react';
import { X, Bell, ChevronDown, ChevronUp } from 'lucide-react';
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
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
    const [readIds, setReadIds] = useState<Set<string>>(new Set());

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
        }
    }, [isOpen]);

    const handleExpand = (id: string) => {
        const newExpanded = new Set(expandedIds);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
            // Mark as read when expanded
            if (!readIds.has(id)) {
                const newRead = new Set(readIds);
                newRead.add(id);
                setReadIds(newRead);
                localStorage.setItem('functer_read_announcements', JSON.stringify(Array.from(newRead)));
            }
        }
        setExpandedIds(newExpanded);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-neon-blue/50 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
                    <h2 className="text-2xl font-black text-white flex items-center gap-3 italic tracking-wider">
                        <Bell className="text-neon-blue" /> NEWS
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <X size={24} className="text-gray-400" />
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {loading ? (
                        <div className="text-center text-gray-500 py-10">Loading...</div>
                    ) : announcements.length === 0 ? (
                        <div className="text-center text-gray-500 py-10">No announcements yet.</div>
                    ) : (
                        announcements.map(item => {
                            const isNew = !readIds.has(item.id);
                            const isExpanded = expandedIds.has(item.id);

                            return (
                                <div
                                    key={item.id}
                                    className={`
                                        border rounded-xl transition-all duration-300 overflow-hidden
                                        ${isExpanded ? 'bg-white/5 border-neon-blue/30' : 'bg-black/40 border-white/10 hover:border-white/30'}
                                    `}
                                >
                                    <button
                                        onClick={() => handleExpand(item.id)}
                                        className="w-full flex items-center gap-4 p-4 text-left"
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                {isNew && (
                                                    <span className="bg-neon-pink text-white text-[10px] font-bold px-1.5 py-0.5 rounded animate-pulse">
                                                        NEW!
                                                    </span>
                                                )}
                                                <span className={`text-[10px] font-mono opacity-60 ${item.type === 'important' ? 'text-red-400' :
                                                        item.type === 'maintenance' ? 'text-orange-400' :
                                                            item.type === 'update' ? 'text-neon-green' : 'text-neon-blue'
                                                    }`}>
                                                    {new Date(item.createdAt).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <h3 className={`font-bold text-sm ${isNew ? 'text-white' : 'text-gray-400'} ${isExpanded ? 'text-neon-blue' : ''}`}>
                                                {item.title || "Announcement"}
                                            </h3>
                                        </div>
                                        {isExpanded ? <ChevronUp size={20} className="text-gray-500" /> : <ChevronDown size={20} className="text-gray-500" />}
                                    </button>

                                    {/* Content (Accordion) */}
                                    {isExpanded && (
                                        <div className="px-4 pb-4 animate-in slide-in-from-top-2">
                                            <hr className="border-white/10 mb-4" />
                                            <div className="text-sm text-gray-300 markdown-content">
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                    components={{
                                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                                        a: ({ node, ...props }) => <a className="text-neon-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside ml-2 mb-2" {...props} />,
                                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside ml-2 mb-2" {...props} />
                                                    }}
                                                >
                                                    {item.message}
                                                </ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};
