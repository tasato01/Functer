import React, { useState, useEffect } from 'react';
import { User, LogOut, Database, ShieldCheck, Save, X, Edit2 } from 'lucide-react';
import { auth, signOutUser } from '../../services/firebase';
import { UserService } from '../../services/UserService';
import { audioService } from '../../services/AudioService';
import { useNavigate } from 'react-router-dom';

interface UserMenuDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onOpenAdmin: () => void;
}

export const UserMenuDialog: React.FC<UserMenuDialogProps> = ({ isOpen, onClose, onOpenAdmin }) => {
    const navigate = useNavigate();
    const user = auth.currentUser;
    const [isAdmin, setIsAdmin] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && user) {
            UserService.isAdmin(user.uid).then(setIsAdmin);
            setNewName(user.displayName || '');
            setIsEditing(false);
        }
    }, [isOpen, user]);

    const handleSaveProfile = async () => {
        if (!user || !newName.trim()) return;
        if (newName === user.displayName) {
            setIsEditing(false);
            return;
        }

        if (!confirm("Update user name? This will update author name on ALL your levels.")) return;

        setLoading(true);
        const success = await UserService.updateUserProfile(user.uid, newName);
        if (success) {
            alert("Profile Updated!");
            setIsEditing(false);
            audioService.playSE('save');
        } else {
            alert("Failed to update profile.");
        }
        setLoading(false);
    };

    const handleRequestAdmin = async () => {
        if (!user) return;
        if (confirm("Request Administrator privileges?")) {
            const success = await UserService.requestAdminAccess({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName
            });
            if (success) {
                alert("Request sent! An Admin needs to approve it.");
            } else {
                alert("Request failed.");
            }
        }
    };

    if (!isOpen || !user) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">
                    <X size={20} />
                </button>

                {/* Profile Header */}
                <div className="flex flex-col items-center mb-6">
                    <div className="w-20 h-20 rounded-full border-2 border-neon-blue bg-gray-800 flex items-center justify-center mb-3">
                        {user.photoURL ? (
                            <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                        ) : (
                            <User size={40} className="text-neon-blue" />
                        )}
                    </div>

                    {isEditing ? (
                        <div className="flex items-center gap-2 w-full max-w-[200px]">
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                className="bg-black/50 border border-neon-blue rounded px-2 py-1 text-white text-center w-full focus:outline-none"
                                autoFocus
                            />
                            <button onClick={handleSaveProfile} disabled={loading} className="text-neon-green hover:text-white">
                                <Save size={20} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-white">{user.displayName}</h2>
                            <button onClick={() => setIsEditing(true)} className="text-gray-500 hover:text-white">
                                <Edit2 size={14} />
                            </button>
                        </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                    {isAdmin && <span className="mt-1 text-[10px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded border border-red-500/30">ADMINISTRATOR</span>}
                </div>

                {/* Menu Items */}
                <div className="space-y-3">
                    <button
                        onClick={() => { onClose(); navigate('/mine'); }}
                        className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-colors text-left"
                    >
                        <Database size={20} className="text-neon-purple" />
                        <div>
                            <div className="font-bold text-sm text-white">My Levels</div>
                            <div className="text-[10px] text-gray-400">Manage your creations</div>
                        </div>
                    </button>

                    {isAdmin ? (
                        <button
                            onClick={() => { onOpenAdmin(); }}
                            className="w-full py-3 px-4 bg-red-900/20 hover:bg-red-900/30 border border-red-500/20 rounded-lg flex items-center gap-3 transition-colors text-left"
                        >
                            <ShieldCheck size={20} className="text-red-400" />
                            <div>
                                <div className="font-bold text-sm text-red-200">Admin Menu</div>
                                <div className="text-[10px] text-red-400/70">Manage users & requests</div>
                            </div>
                        </button>
                    ) : (
                        <button
                            onClick={handleRequestAdmin}
                            className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg flex items-center gap-3 transition-colors text-left group"
                        >
                            <ShieldCheck size={20} className="text-gray-500 group-hover:text-neon-blue transition-colors" />
                            <div>
                                <div className="font-bold text-sm text-gray-400 group-hover:text-neon-blue transition-colors">Request Admin Access</div>
                                <div className="text-[10px] text-gray-500">Become a moderator</div>
                            </div>
                        </button>
                    )}

                    <div className="border-t border-gray-800 my-2"></div>

                    <button
                        onClick={() => { signOutUser(); onClose(); }}
                        className="w-full py-3 px-4 hover:bg-red-900/20 rounded-lg flex items-center gap-3 transition-colors text-left text-red-400 hover:text-red-300"
                    >
                        <LogOut size={20} />
                        <span className="font-bold text-sm">Log Out</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
