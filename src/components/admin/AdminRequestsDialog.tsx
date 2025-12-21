import React, { useState, useEffect } from 'react';
import { ShieldCheck, Check, X, User } from 'lucide-react';
import { UserService, type AdminRequest } from '../../services/UserService';
import { audioService } from '../../services/AudioService';

interface AdminRequestsDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminRequestsDialog: React.FC<AdminRequestsDialogProps> = ({ isOpen, onClose }) => {
    const [requests, setRequests] = useState<AdminRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        setLoading(true);
        const data = await UserService.getAdminRequests();
        setRequests(data);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen) {
            fetchRequests();
        }
    }, [isOpen]);

    const handleApprove = async (req: AdminRequest) => {
        if (!confirm(`Approve admin access for ${req.displayName}?`)) return;
        const success = await UserService.approveAdminRequest(req);
        if (success) {
            audioService.playSE('save');
            fetchRequests();
        } else {
            alert("Failed to approve.");
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-neon-blue rounded-xl w-full max-w-md shadow-[0_0_30px_rgba(0,0,0,0.5)] flex flex-col max-h-[80vh]">
                <div className="flex items-center justify-between p-4 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white tracking-wider flex items-center gap-2">
                        <ShieldCheck className="text-neon-blue" /> ADMIN REQUESTS
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-4 overflow-y-auto flex-1">
                    {loading ? (
                        <div className="text-center text-gray-500 py-8">Loading...</div>
                    ) : requests.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">No pending requests.</div>
                    ) : (
                        <div className="space-y-4">
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
                </div>
            </div>
        </div>
    );
};
