import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, User, AlertTriangle, Send, HelpCircle, Trash2 } from 'lucide-react';
import { UserService, type AdminRequest, type UserProfile } from '../../services/UserService';
import { AnnouncementService } from '../../services/AnnouncementService';
import { audioService } from '../../services/AudioService';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// Markdown Styles
const markdownStyles = `
    .katex-display {
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 8px;
        margin: 8px 0;
        overflow-x: auto;
    }
    .katex {
        font-size: 1.1em;
        color: #e0f2fe;
    }
`;

interface AdminManagementDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminManagementDialog: React.FC<AdminManagementDialogProps> = ({ isOpen, onClose }) => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'requests' | 'users' | 'announce'>('requests');
    const [requests, setRequests] = useState<AdminRequest[]>([]);
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'requests') {
            const data = await UserService.getAdminRequests();
            setRequests(data);
        } else if (activeTab === 'users') {
            const data = await UserService.getAllUsers();
            // Sort admins first
            data.sort((a, b) => (b.isAdmin ? 1 : 0) - (a.isAdmin ? 1 : 0));
            setUsers(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            if (activeTab === 'announce') {
                setLoading(false);
            } else {
                fetchData();
            }
        }
    }, [isOpen, activeTab]);

    const handleApprove = async (req: AdminRequest) => {
        if (!confirm(`Approve admin access for ${req.displayName}?`)) return;
        const success = await UserService.approveAdminRequest(req);
        if (success) {
            audioService.playSE('save');
            fetchData();
        } else {
            alert("Failed to approve.");
        }
    };

    const handleRevoke = async (user: UserProfile) => {
        if (!confirm(`Are you sure you want to REVOKE admin privileges from ${user.displayName}?`)) return;
        const success = await UserService.revokeAdmin(user.uid);
        if (success) {
            alert("Privileges revoked.");
            fetchData();
        } else {
            alert("Failed to revoke.");
        }
    };



    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <style>{markdownStyles}</style>
            <div className="bg-gray-900 border border-neon-blue rounded-xl w-full max-w-7xl shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col h-[85vh]">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                        <ShieldCheck className="text-neon-blue" /> ADMIN PANEL
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => { setActiveTab('requests'); audioService.playSE('click'); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'requests' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
                    >
                        REQUESTS
                    </button>
                    <button
                        onClick={() => { setActiveTab('users'); audioService.playSE('click'); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'users' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
                    >
                        USERS
                    </button>
                    <button
                        onClick={() => { setActiveTab('announce'); audioService.playSE('click'); }}
                        className={`flex-1 py-3 text-sm font-bold transition-colors ${activeTab === 'announce' ? 'bg-neon-blue/10 text-neon-blue border-b-2 border-neon-blue' : 'text-gray-500 hover:text-white'}`}
                    >
                        ANNOUNCE
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 overflow-y-auto flex-1 bg-black/20">
                    {loading ? (
                        <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : (
                        <>
                            {activeTab === 'requests' && (
                                <div className="space-y-4">
                                    {requests.length === 0 && <div className="text-center text-gray-500 py-8">No pending requests.</div>}
                                    {requests.map(req => (
                                        <div key={req.id} className="bg-black/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-2">
                                                    <User size={16} className="text-gray-400" />
                                                    {req.displayName}
                                                </div>
                                                <div className="text-xs text-gray-400 mt-1">{req.email}</div>
                                                <div className="text-[10px] text-gray-600 mt-1">
                                                    {new Date(req.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => handleApprove(req)}
                                                className="p-2 bg-neon-green/20 border border-neon-green/50 text-neon-green rounded hover:bg-neon-green/30 transition-colors"
                                                title="Approve"
                                            >
                                                <Check size={20} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'users' && (
                                <div className="space-y-2">
                                    {users.map(u => (
                                        <div key={u.uid} className={`bg-black/50 border rounded-lg p-3 flex items-center justify-between ${u.isAdmin ? 'border-neon-blue/50' : 'border-gray-800'}`}>
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${u.isAdmin ? 'bg-neon-blue/20 text-neon-blue' : 'bg-gray-800 text-gray-500'}`}>
                                                    {u.isAdmin ? <ShieldCheck size={16} /> : <User size={16} />}
                                                </div>
                                                <div>
                                                    <div
                                                        className="font-bold text-white text-sm hover:text-neon-blue cursor-pointer transition-colors"
                                                        onClick={() => { onClose(); navigate(`/user/${u.uid}`); }}
                                                    >
                                                        {u.displayName}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">{u.email || u.uid}</div>
                                                </div>
                                            </div>

                                            {u.isAdmin && u.uid !== auth.currentUser?.uid && (
                                                <button
                                                    onClick={() => handleRevoke(u)}
                                                    className="px-2 py-1 bg-red-900/40 text-red-400 text-[10px] border border-red-500/20 rounded hover:bg-red-900/60 transition-colors flex items-center gap-1"
                                                >
                                                    <AlertTriangle size={10} /> REVOKE
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {activeTab === 'announce' && (
                                <AdminAnnouncementPanel />
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const AdminAnnouncementPanel: React.FC = () => {
    const [mode, setMode] = useState<'list' | 'edit'>('list');
    const [announcements, setAnnouncements] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [showHelp, setShowHelp] = useState(false);

    // Edit State
    const [editId, setEditId] = useState<string | null>(null);
    const [msg, setMsg] = useState('');
    const [title, setTitle] = useState('');
    const [type, setType] = useState<'info' | 'maintenance' | 'update' | 'important'>('info');

    const fetchAll = async () => {
        setLoading(true);
        const data = await AnnouncementService.getAllAnnouncements();
        setAnnouncements(data);
        setLoading(false);
    };

    useEffect(() => {
        if (mode === 'list') fetchAll();
    }, [mode]);

    const handleEdit = (item: any) => {
        setEditId(item.id);
        setTitle(item.title || '');
        setMsg(item.message);
        setType(item.type);
        setMode('edit');
    };

    const handleCreate = () => {
        setEditId(null);
        setTitle('');
        setMsg('');
        setType('info');
        setMode('edit');
    };

    const handleSave = async () => {
        if (!msg.trim()) return alert("Message is empty");
        if (!confirm(editId ? "Update this announcement?" : "Post this announcement?")) return;

        setLoading(true);
        let success = false;
        if (editId) {
            success = await AnnouncementService.updateAnnouncement(editId, { title, message: msg, type });
        } else {
            success = await AnnouncementService.addAnnouncement(msg, type, title);
        }

        if (success) {
            audioService.playSE('save');
            alert("Success!");
            setMode('list');
        } else {
            alert("Failed.");
        }
        setLoading(false);
    };

    if (mode === 'list') {
        return (
            <div className="space-y-4">
                <button
                    onClick={handleCreate}
                    className="w-full py-3 bg-neon-blue/20 border border-neon-blue text-neon-blue font-bold rounded-lg hover:bg-neon-blue/30 transition-all flex items-center justify-center gap-2"
                >
                    <Send size={18} /> CREATE NEW
                </button>

                {loading ? <div>Loading...</div> : (
                    <div className="space-y-2">
                        {announcements.map(a => (
                            <div key={a.id} className="bg-black/50 border border-gray-700 rounded-lg p-3 flex justify-between items-center hover:border-white/30">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-[10px] uppercase font-bold px-1.5 rounded border ${a.type === 'important' ? 'border-red-500 text-red-500' :
                                            a.type === 'maintenance' ? 'border-orange-500 text-orange-500' :
                                                a.type === 'update' ? 'border-neon-green text-neon-green' : 'border-blue-500 text-blue-500'
                                            }`}>{a.type}</span>
                                        <span className="text-xs text-gray-500">{new Date(a.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    <div className="font-bold text-sm text-white">{a.title}</div>
                                    <div className="text-xs text-gray-400 truncate w-64">{a.message.substring(0, 50)}...</div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleEdit(a)} className="px-3 py-1 bg-white/10 rounded hover:bg-white/20 text-sm">EDIT</button>
                                    <button
                                        onClick={async () => {
                                            if (confirm("Delete this announcement?")) {
                                                setLoading(true);
                                                const success = await AnnouncementService.deleteAnnouncement(a.id);
                                                if (success) {
                                                    audioService.playSE('save'); // 'pico'? 'trash'?
                                                    fetchAll();
                                                } else {
                                                    alert("Failed to delete.");
                                                }
                                                setLoading(false);
                                            }
                                        }}
                                        className="p-1.5 bg-red-900/40 border border-red-500/20 text-red-400 rounded hover:bg-red-900/60 transition-colors"
                                        title="Delete"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative">
            {/* Help Modal */}
            {showHelp && (
                <div className="absolute inset-0 z-20 bg-gray-900/95 backdrop-blur flex flex-col p-6 overflow-y-auto animate-in fade-in">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-xl font-bold text-white">Markdown Cheat Sheet</h3>
                        <button onClick={() => setShowHelp(false)} className="bg-white/10 p-2 rounded-full"><X size={20} /></button>
                    </div>
                    <div className="space-y-4 text-sm text-gray-300">
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Headers</div>
                            <code># Large Header</code><br />
                            <code>## Medium Header</code>
                        </div>
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Emphasis</div>
                            <code>**Bold Text**</code> &rarr; <b>Bold Text</b><br />
                            <code>*Italic Text*</code> &rarr; <i>Italic Text</i>
                        </div>
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Lists</div>
                            <code>- Item 1</code><br />
                            <code>- Item 2</code>
                        </div>
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Code</div>
                            <code>`inline code`</code> (Backticks) &rarr; <code className="bg-black/50 px-1 rounded text-neon-pink">inline code</code><br />
                            <pre className="bg-black/50 p-2 mt-1 border border-white/10 rounded">
                                ```
                                Block Code
                                ```
                            </pre>
                        </div>
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Quotes</div>
                            <code>&gt; Blockquote text</code>
                        </div>
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Math (LaTeX)</div>
                            <code>$E = mc^2$</code>
                        </div>
                        <div>
                            <div className="font-bold text-neon-blue mb-1">Colors (Experimental)</div>
                            <p>Markdown doesn't support colors by default. However, headers and bold text are styled with theme colors automatically.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setMode('list')} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                    <X size={16} /> CANCEL
                </button>
                <div className="flex items-center gap-4">
                    <div className="font-bold text-white">{editId ? "EDIT ANNOUNCEMENT" : "NEW ANNOUNCEMENT"}</div>
                    <button onClick={() => setShowHelp(!showHelp)} className="text-neon-blue hover:text-white flex items-center gap-1 text-xs px-2 py-1 bg-neon-blue/10 rounded border border-neon-blue/30">
                        <HelpCircle size={14} /> Markdown Help
                    </button>
                </div>
                <button onClick={handleSave} className="text-neon-green hover:text-white flex items-center gap-1 text-sm font-bold">
                    <Check size={16} /> SAVE
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                {/* Controls */}
                <div className="grid grid-cols-4 gap-2 shrink-0">
                    {(['info', 'maintenance', 'update', 'important'] as const).map(t => (
                        <button
                            key={t}
                            onClick={() => setType(t)}
                            className={`py-1 text-[10px] font-bold rounded uppercase border ${type === t ? 'bg-white/20 border-white text-white' : 'bg-black/40 border-gray-700 text-gray-500'}`}
                        >
                            {t}
                        </button>
                    ))}
                </div>
                <input
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="Title"
                    className="bg-black/50 border border-gray-700 rounded p-2 text-white text-sm shrink-0"
                />

                {/* Editor & Preview Split */}
                <div className="flex-1 flex gap-2 min-h-0">
                    <textarea
                        value={msg}
                        onChange={e => setMsg(e.target.value)}
                        placeholder="Message (Markdown & LaTeX supported)"
                        className="flex-1 bg-black/50 border border-gray-700 rounded p-2 text-white text-xs resize-none font-mono focus:border-neon-blue focus:outline-none"
                        spellCheck={false}
                    />
                    <div className="flex-1 bg-gray-900 border border-gray-700 rounded p-4 overflow-y-auto">
                        <div className="text-[10px] text-gray-500 font-bold mb-2 border-b border-gray-800 pb-1">PREVIEW</div>
                        <div className="text-sm text-gray-300 markdown-content">
                            <ReactMarkdown
                                remarkPlugins={[remarkMath]}
                                rehypePlugins={[rehypeKatex]}
                                components={{
                                    h1: ({ node, ...props }) => <h2 className="text-xl font-bold mt-4 mb-2 border-l-4 border-neon-blue pl-2 text-white" {...props} />,
                                    h2: ({ node, ...props }) => <h3 className="text-lg font-bold mt-3 mb-2 text-neon-blue" {...props} />,
                                    h3: ({ node, ...props }) => <h4 className="text-base font-bold mt-2 mb-1 text-white" {...props} />,
                                    p: ({ node, ...props }) => <p className="mb-2 leading-relaxed text-gray-300" {...props} />,
                                    strong: ({ node, ...props }) => <strong className="font-bold text-white relative inline-block after:content-[''] after:absolute after:bottom-0 after:left-0 after:w-full after:h-[2px] after:bg-neon-blue/50" {...props} />,
                                    em: ({ node, ...props }) => <em className="italic text-gray-400" {...props} />,
                                    a: ({ node, ...props }) => <a className="text-neon-blue hover:underline" target="_blank" rel="noopener noreferrer" {...props} />,
                                    ul: ({ node, ...props }) => <ul className="list-disc list-inside ml-2 mb-2" {...props} />,
                                    ol: ({ node, ...props }) => <ol className="list-decimal list-inside ml-2 mb-2" {...props} />,
                                    code: ({ node, ...props }) => <code className="bg-black/50 rounded px-1.5 py-0.5 text-neon-pink font-mono text-xs border border-white/10" {...props} />,
                                    pre: ({ node, ...props }) => <pre className="bg-black/50 rounded p-3 mb-2 overflow-x-auto border border-white/10 text-xs" {...props} />,
                                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-gray-600 pl-3 py-1 italic text-gray-400 bg-white/5 my-2 rounded-r" {...props} />,
                                }}
                            >
                                {msg}
                            </ReactMarkdown>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

