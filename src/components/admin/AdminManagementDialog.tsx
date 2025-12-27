import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, User, AlertTriangle, Send } from 'lucide-react';
import { UserService, type AdminRequest, type UserProfile } from '../../services/UserService';
import { AnnouncementService } from '../../services/AnnouncementService';
import { audioService } from '../../services/AudioService';
import { useNavigate } from 'react-router-dom';
import { auth } from '../../services/firebase';

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

    // Announcement State
    const [announceMsg, setAnnounceMsg] = useState('');
    const [announceTitle, setAnnounceTitle] = useState('');
    const [announceType, setAnnounceType] = useState<'info' | 'maintenance' | 'update' | 'important'>('info');

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

    const handlePostAnnouncement = async () => {
        if (!announceMsg.trim()) {
            alert("Message cannot be empty.");
            return;
        }
        if (!confirm("Post this announcement to all users?")) return;

        setLoading(true);
        const success = await AnnouncementService.addAnnouncement(announceMsg, announceType, announceTitle);
        if (success) {
            audioService.playSE('save');
            alert("Announcement Posted Successfully!");
            setAnnounceMsg('');
            setAnnounceTitle('');
        } else {
            alert("Failed to post announcement.");
        }
        setLoading(false);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-neon-blue rounded-xl w-full max-w-lg shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col h-[70vh]">

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
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">TYPE</label>
                                        <div className="grid grid-cols-4 gap-2">
                                            {(['info', 'maintenance', 'update', 'important'] as const).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setAnnounceType(type)}
                                                    className={`py-2 text-xs font-bold rounded uppercase transition-colors border ${announceType === type
                                                        ? type === 'important' ? 'bg-red-500/20 border-red-500 text-red-400'
                                                            : type === 'maintenance' ? 'bg-orange-500/20 border-orange-500 text-orange-400'
                                                                : type === 'update' ? 'bg-neon-green/20 border-neon-green text-neon-green'
                                                                    : 'bg-blue-500/20 border-blue-500 text-blue-400'
                                                        : 'bg-black/50 border-gray-700 text-gray-500 hover:bg-white/5'
                                                        }`}
                                                >
                                                    {type}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-1">TITLE (Optional)</label>
                                        <input
                                            type="text"
                                            value={announceTitle}
                                            onChange={(e) => setAnnounceTitle(e.target.value)}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-neon-blue focus:outline-none mb-4"
                                            placeholder="Announcement Title"
                                        />

                                        <label className="block text-xs font-bold text-gray-400 mb-1">MESSAGE (Markdown supported)</label>
                                        <textarea
                                            value={announceMsg}
                                            onChange={(e) => setAnnounceMsg(e.target.value)}
                                            className="w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white text-sm focus:border-neon-blue focus:outline-none min-h-[150px]"
                                            placeholder="Enter announcement message..."
                                        />
                                    </div>

                                    <button
                                        onClick={handlePostAnnouncement}
                                        className="w-full py-3 bg-neon-blue/20 border border-neon-blue text-neon-blue font-bold rounded-lg hover:bg-neon-blue/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Send size={18} /> POST ANNOUNCEMENT
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
