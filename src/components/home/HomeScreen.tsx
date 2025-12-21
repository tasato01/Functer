import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Database, Trophy, User as UserIcon, LogOut, ShieldCheck, BookOpen, Settings, X, Volume2, Maximize } from 'lucide-react';
import { levelService } from '../../services/FirebaseLevelService';
import { audioService } from '../../services/AudioService';
import { AuthDialog } from '../editor/AuthDialog';
import { auth, signOutUser } from '../../services/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { ADMIN_UIDS } from '../../constants/admin';

export const HomeScreen: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [bgmVolume, setBgmVolume] = useState(audioService.getBGMVolume() * 100);
    const [seVolume, setSeVolume] = useState(audioService.getSEVolume() * 100);

    // Auth & Prefetch
    useEffect(() => {
        levelService.getOfficialLevels().catch(console.error);
        levelService.getUserLevels().catch(console.error);

        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    const isAdmin = user && ADMIN_UIDS.includes(user.uid);

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            await signOutUser();
        }
    };

    return (
        <div className="h-full flex flex-col items-center justify-center relative overflow-hidden bg-black text-white">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neon-blue/10 via-transparent to-transparent pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-pink to-transparent opacity-50"></div>
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-blue to-transparent opacity-50"></div>

            {/* Title */}
            <div className="z-10 text-center mb-12 animate-in fade-in zoom-in duration-700">
                <h1 className="text-7xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-neon-pink via-white to-neon-blue drop-shadow-[0_0_15px_rgba(255,255,255,0.5)]">
                    FUNCTER
                </h1>
                <p className="text-neon-blue/80 tracking-widest mt-2 uppercase text-sm font-bold">
                    Functional Graph Action Puzzle
                </p>
            </div>

            {/* Menu List */}
            <div className="z-10 flex flex-col gap-4 w-full max-w-md px-8">
                {/* Standard Stages */}
                <button
                    onClick={() => { audioService.playSE('click'); navigate('/official'); }}
                    className="group relative p-4 bg-gray-900/50 border border-white/10 rounded-xl hover:bg-white/5 hover:border-neon-pink/50 transition-all duration-300 backdrop-blur-sm flex items-center gap-4 overflow-hidden w-full h-[78px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/0 to-neon-pink/0 group-hover:from-neon-pink/10 group-hover:to-transparent transition-all duration-500"></div>
                    <Trophy size={24} className="text-neon-pink group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-white group-hover:text-neon-pink transition-colors">OFFICIAL STAGES</h3>
                        <p className="text-[10px] text-gray-400">Challenge the standard puzzles</p>
                    </div>
                </button>

                {/* User Stages */}
                <button
                    onClick={() => { audioService.playSE('click'); navigate('/user'); }}
                    className="group relative p-4 bg-gray-900/50 border border-white/10 rounded-xl hover:bg-white/5 hover:border-neon-green/50 transition-all duration-300 backdrop-blur-sm flex items-center gap-4 overflow-hidden w-full h-[78px]"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-green/0 to-neon-green/0 group-hover:from-neon-green/10 group-hover:to-transparent transition-all duration-500"></div>
                    <Database size={24} className="text-neon-green group-hover:scale-110 transition-transform duration-300" />
                    <div className="text-left">
                        <h3 className="text-lg font-bold text-white group-hover:text-neon-green transition-colors">COMMUNITY STAGES</h3>
                        <p className="text-[10px] text-gray-400">Play stages created by community</p>
                    </div>
                </button>

                {/* Editor & Settings Row */}
                <div className="flex gap-4 w-full">
                    {/* Editor Mode */}
                    <button
                        onClick={() => { audioService.playSE('click'); navigate('/edit'); }}
                        className="group relative flex-1 p-3 bg-gray-900/50 border border-white/10 rounded-xl hover:bg-white/5 hover:border-neon-blue/50 transition-all duration-300 backdrop-blur-sm flex flex-col items-center justify-center gap-2 overflow-hidden h-[78px]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/0 to-neon-blue/0 group-hover:from-neon-blue/10 group-hover:to-transparent transition-all duration-500"></div>
                        <PenTool size={24} className="text-neon-blue group-hover:scale-110 transition-transform duration-300" />
                        <div className="text-center w-full">
                            <h3 className="text-xs font-bold text-white group-hover:text-neon-blue transition-colors truncate">EDITOR</h3>
                            <p className="text-[9px] text-gray-400 truncate opacity-70">Create</p>
                        </div>
                    </button>

                    {/* My Levels (Only if logged in) */}
                    {user && (
                        <button
                            onClick={() => { audioService.playSE('click'); navigate('/mine'); }}
                            className="group relative flex-1 p-3 bg-gray-900/50 border border-white/10 rounded-xl hover:bg-white/5 hover:border-neon-purple/50 transition-all duration-300 backdrop-blur-sm flex flex-col items-center justify-center gap-2 overflow-hidden h-[78px]"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-neon-purple/0 to-neon-purple/0 group-hover:from-neon-purple/10 group-hover:to-transparent transition-all duration-500"></div>
                            <Database size={24} className="text-neon-purple group-hover:scale-110 transition-transform duration-300" />
                            <div className="text-center w-full">
                                <h3 className="text-xs font-bold text-white group-hover:text-neon-purple transition-colors truncate">MY STAGES</h3>
                                <p className="text-[9px] text-gray-400 truncate opacity-70">Manage</p>
                            </div>
                        </button>
                    )}

                    {/* Help */}
                    <button
                        onClick={() => { audioService.playSE('click'); navigate('/help'); }}
                        className="group relative flex-1 p-3 bg-gray-900/50 border border-white/10 rounded-xl hover:bg-white/5 hover:border-neon-yellow/50 transition-all duration-300 backdrop-blur-sm flex flex-col items-center justify-center gap-2 overflow-hidden h-[78px]"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-neon-yellow/0 to-neon-yellow/0 group-hover:from-neon-yellow/10 group-hover:to-transparent transition-all duration-500"></div>
                        <BookOpen size={24} className="text-neon-yellow group-hover:scale-110 transition-transform duration-300" />
                        <div className="text-center w-full">
                            <h3 className="text-xs font-bold text-white group-hover:text-neon-yellow transition-colors truncate">HOW TO PLAY</h3>
                            <p className="text-[9px] text-gray-400 truncate opacity-70">Guide</p>
                        </div>
                    </button>
                </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-4 text-[10px] text-gray-600 font-mono">
                FUNCTER v0.1.0 - PRE_ALPHA
            </div>

            {/* Top Right Controls */}
            <div className="absolute top-6 right-6 z-20 flex gap-3">
                <button
                    onClick={() => { audioService.playSE('click'); setShowSettings(true); }}
                    className="p-2 bg-gray-900/50 border border-white/20 rounded-full hover:bg-white/10 hover:border-white/50 transition-all backdrop-blur-md"
                    title="Settings"
                >
                    <Settings className="text-gray-300 hover:text-white" size={20} />
                </button>

                {user ? (
                    <div className="flex gap-2">
                        {isAdmin && (
                            <div className="flex items-center gap-1 bg-red-900/80 text-red-200 text-[10px] px-2 py-1 rounded font-bold border border-red-500/30 shadow-[0_0_10px_rgba(255,0,0,0.3)] select-none">
                                <ShieldCheck size={12} />
                                ADMIN MODE
                            </div>
                        )}
                        <button
                            onClick={() => { audioService.playSE('click'); navigate(`/user/${user.uid}`); }}
                            className="flex items-center gap-2 px-4 py-2 bg-neon-blue/20 border border-neon-blue/50 rounded-full hover:bg-neon-blue/30 backdrop-blur-md transition-all"
                        >
                            {user.photoURL ? (
                                <img src={user.photoURL} className="w-5 h-5 rounded-full border border-white/20" />
                            ) : (
                                <UserIcon size={16} className="text-neon-blue" />
                            )}
                            <span className="font-bold text-sm text-neon-blue hidden sm:inline">
                                {user.displayName || 'Player'}
                            </span>
                        </button>
                        <button
                            onClick={() => { audioService.playSE('click'); handleLogout(); }}
                            className="p-2 bg-red-900/50 border border-red-500/30 rounded-full hover:bg-red-900/80 transition-all backdrop-blur-md"
                            title="Logout"
                        >
                            <LogOut size={16} className="text-red-300" />
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => { audioService.playSE('click'); setShowAuthDialog(true); }}
                        className="px-6 py-2 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 backdrop-blur-md font-bold text-sm"
                    >
                        LOGIN
                    </button>
                )}
            </div>

            {/* Auth Dialog */}
            <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />

            {/* Settings Dialog */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-900 border border-white/20 rounded-xl w-full max-w-sm shadow-[0_0_30px_rgba(0,0,0,0.5)] p-6 relative">
                        <div className="flex justify-between items-center mb-8">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-wider">
                                <Settings size={20} className="text-neon-blue" /> SETTINGS
                            </h2>
                            <button onClick={() => { audioService.playSE('click'); setShowSettings(false); }} className="text-gray-400 hover:text-white transition-colors">
                                <X size={24} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* BGM Volume */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold text-gray-300">
                                    <span className="flex items-center gap-2"><Volume2 size={16} className="text-neon-pink" /> BGM VOLUME</span>
                                    <span className="text-neon-pink">{Math.round(bgmVolume)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={bgmVolume}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setBgmVolume(val);
                                        audioService.setBGMVolume(val / 100);
                                    }}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-pink hover:accent-neon-pink/80 transition-all"
                                />
                            </div>

                            {/* SE Volume */}
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm font-bold text-gray-300">
                                    <span className="flex items-center gap-2"><Volume2 size={16} className="text-neon-blue" /> SE VOLUME</span>
                                    <span className="text-neon-blue">{Math.round(seVolume)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={seVolume}
                                    onChange={(e) => {
                                        const val = Number(e.target.value);
                                        setSeVolume(val);
                                        audioService.setSEVolume(val / 100);
                                    }}
                                    onMouseUp={() => audioService.playSE('click')}
                                    className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-blue hover:accent-neon-blue/80 transition-all"
                                />
                            </div>
                        </div>

                        {/* Fullscreen Toggle */}
                        <div className="flex justify-between items-center text-sm font-bold text-gray-300">
                            <span className="flex items-center gap-2"><Maximize size={16} className="text-neon-green" /> FULLSCREEN</span>
                            <button
                                onClick={() => {
                                    audioService.playSE('click');
                                    if (!document.fullscreenElement) {
                                        document.documentElement.requestFullscreen();
                                    } else {
                                        document.exitFullscreen();
                                    }
                                }}
                                className={`w-12 h-6 rounded-full transition-colors relative ${document.fullscreenElement ? 'bg-neon-green' : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${document.fullscreenElement ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        <div className="mt-8 text-center">
                            <button
                                onClick={() => { audioService.playSE('click'); setShowSettings(false); }}
                                className="px-6 py-2 bg-white/10 hover:bg-white/20 rounded-full text-sm font-bold transition-colors"
                            >
                                CLOSE
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
