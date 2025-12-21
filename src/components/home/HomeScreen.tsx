import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PenTool, Database, Trophy, User as UserIcon, ShieldCheck, BookOpen, Settings, X, Volume2, Maximize } from 'lucide-react';
import { levelService } from '../../services/FirebaseLevelService';
import { audioService } from '../../services/AudioService';
import { AuthDialog } from '../editor/AuthDialog';
import { AdminManagementDialog } from '../admin/AdminManagementDialog';
import { UserMenuDialog } from './UserMenuDialog';
import { auth } from '../../services/firebase';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { UserService } from '../../services/UserService';
import { MathBackground } from '../common/MathBackground';

export const HomeScreen: React.FC = () => {
    const navigate = useNavigate();
    const [user, setUser] = useState<User | null>(null);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAdminPanel, setShowAdminPanel] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [bgmVolume, setBgmVolume] = useState(audioService.getBGMVolume() * 100);
    const [seVolume, setSeVolume] = useState(audioService.getSEVolume() * 100);
    const [isAdmin, setIsAdmin] = useState(false);

    // Auth & Prefetch
    useEffect(() => {
        levelService.getOfficialLevels().catch(console.error);
        levelService.getUserLevels().catch(console.error);

        const unsubscribe = onAuthStateChanged(auth, async (u) => {
            setUser(u);
            if (u) {
                const adminStatus = await UserService.isAdmin(u.uid);
                setIsAdmin(adminStatus);
                // Sync user data
                UserService.syncUser({
                    uid: u.uid,
                    email: u.email,
                    displayName: u.displayName
                });
            } else {
                setIsAdmin(false);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="h-full flex flex-col items-center relative overflow-y-auto text-white font-sans bg-black">
            <MathBackground />

            {/* Title / Header */}
            <div className="z-10 text-center flex-none pt-12 pb-4 animate-in fade-in zoom-in duration-700">
                <h1 className="text-6xl md:text-8xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-neon-pink via-white to-neon-blue drop-shadow-[0_0_20px_rgba(255,255,255,0.4)] italic py-2 px-4 leading-normal">
                    FUNCTER
                </h1>
                <p className="text-neon-blue/80 tracking-[0.5em] mt-2 uppercase text-[10px] md:text-xs font-bold">
                    Functional Graph Action Puzzle
                </p>
            </div>

            {/* Main Center Stack */}
            <div className="z-10 flex flex-col gap-3 md:gap-6 w-full max-w-lg px-6 flex-1 justify-center min-h-0 shrink-0">

                {/* 1. Official Stages (Primary) */}
                <button
                    onClick={() => { audioService.playSE('click'); navigate('/official'); }}
                    className="group relative w-full h-24 md:h-32 bg-gray-900/60 border border-neon-pink/30 rounded-2xl overflow-hidden hover:border-neon-pink transition-all duration-300 backdrop-blur-sm shadow-[0_0_15px_rgba(255,0,128,0.15)] hover:shadow-neon-pink/40 shrink-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-pink/10 via-transparent to-transparent group-hover:from-neon-pink/20 transition-all duration-500" />
                    <div className="absolute inset-0 flex items-center justify-between px-6 md:px-8">
                        <div className="text-left">
                            <h2 className="text-2xl md:text-3xl font-black italic text-white group-hover:text-neon-pink transition-colors tracking-tighter">
                                OFFICIAL
                            </h2>
                            <p className="text-[10px] md:text-xs text-neon-pink/70 font-mono mt-1 group-hover:text-neon-pink">CHALLENGE STANDARD</p>
                        </div>
                        <Trophy size={40} className="text-neon-pink/50 group-hover:text-neon-pink group-hover:rotate-12 transition-all duration-300 md:w-12 md:h-12" />
                    </div>
                </button>

                {/* 2. Community Stages */}
                <button
                    onClick={() => { audioService.playSE('click'); navigate('/user'); }}
                    className="group relative w-full h-20 md:h-24 bg-gray-900/60 border border-neon-green/30 rounded-2xl overflow-hidden hover:border-neon-green transition-all duration-300 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,0,0.15)] hover:shadow-neon-green/40 shrink-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-green/10 via-transparent to-transparent group-hover:from-neon-green/20 transition-all duration-500" />
                    <div className="absolute inset-0 flex items-center justify-between px-6 md:px-8">
                        <div className="text-left">
                            <h2 className="text-xl md:text-2xl font-black italic text-white group-hover:text-neon-green transition-colors tracking-tighter">
                                COMMUNITY
                            </h2>
                            <p className="text-[10px] md:text-xs text-neon-green/70 font-mono mt-1 group-hover:text-neon-green">PLAY USER CREATIONS</p>
                        </div>
                        <Database size={30} className="text-neon-green/50 group-hover:text-neon-green group-hover:rotate-12 transition-all duration-300 md:w-9 md:h-9" />
                    </div>
                </button>

                {/* 3. Editor */}
                <button
                    onClick={() => { audioService.playSE('click'); navigate('/edit'); }}
                    className="group relative w-full h-20 md:h-24 bg-gray-900/60 border border-neon-blue/30 rounded-2xl overflow-hidden hover:border-neon-blue transition-all duration-300 backdrop-blur-sm shadow-[0_0_15px_rgba(0,255,255,0.15)] hover:shadow-neon-blue/40 shrink-0"
                >
                    <div className="absolute inset-0 bg-gradient-to-r from-neon-blue/10 via-transparent to-transparent group-hover:from-neon-blue/20 transition-all duration-500" />
                    <div className="absolute inset-0 flex items-center justify-between px-6 md:px-8">
                        <div className="text-left">
                            <h2 className="text-xl md:text-2xl font-black italic text-white group-hover:text-neon-blue transition-colors tracking-tighter">
                                EDITOR
                            </h2>
                            <p className="text-[10px] md:text-xs text-neon-blue/70 font-mono mt-1 group-hover:text-neon-blue">CREATE NEW LEVEL</p>
                        </div>
                        <PenTool size={24} className="text-neon-blue/50 group-hover:text-neon-blue group-hover:-translate-y-1 group-hover:translate-x-1 transition-all duration-300 md:w-7 md:h-7" />
                    </div>
                </button>
            </div>

            {/* Bottom Dock - Changed to relative flex item to prevent overlap */}
            <div className="z-20 flex gap-6 p-4 bg-gray-900/60 backdrop-blur-md rounded-full border border-white/10 shadow-2xl mt-4 mb-8 shrink-0">
                {user && (
                    <button
                        onClick={() => { audioService.playSE('click'); navigate('/mine'); }}
                        className="group flex flex-col items-center gap-1 text-gray-400 hover:text-orange-500 transition-colors w-16"
                    >
                        <div className="p-2 rounded-full group-hover:bg-orange-500/20 group-hover:shadow-[0_0_10px_rgba(249,115,22,0.5)] transition-all duration-300">
                            <Database size={20} className="group-hover:text-orange-500" />
                        </div>
                        <span className="text-[9px] font-bold group-hover:text-orange-500 group-hover:shadow-orange-500/50">MY STAGE</span>
                    </button>
                )}

                <button
                    onClick={() => { audioService.playSE('click'); navigate('/help'); }}
                    className="group flex flex-col items-center gap-1 text-gray-400 hover:text-neon-yellow transition-colors w-16"
                >
                    <div className="p-2 rounded-full group-hover:bg-neon-yellow/20 group-hover:shadow-[0_0_10px_theme(colors.neon.yellow)] transition-all duration-300">
                        <BookOpen size={20} className="group-hover:text-neon-yellow" />
                    </div>
                    <span className="text-[9px] font-bold group-hover:text-neon-yellow">HELP</span>
                </button>

                <button
                    onClick={() => { audioService.playSE('click'); setShowSettings(true); }}
                    className="group flex flex-col items-center gap-1 text-gray-400 hover:text-white transition-colors w-16"
                >
                    <div className="p-2 rounded-full group-hover:bg-white/20 group-hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all duration-300">
                        <Settings size={20} className="group-hover:text-white" />
                    </div>
                    <span className="text-[9px] font-bold group-hover:text-white">SETTING</span>
                </button>
            </div>

            {/* Version Footer - Now part of flow */}
            <div className="mb-2 text-[8px] text-gray-700 font-mono select-none pointer-events-none shrink-0">
                FUNCTER v0.1.0
            </div>
            <div className="absolute top-6 right-6 z-20 flex gap-3">
                {user ? (
                    <div className="flex gap-2">
                        {isAdmin && (
                            <div className="flex items-center gap-1 bg-red-900/80 text-red-200 text-[10px] px-2 py-1 rounded font-bold border border-red-500/30 shadow-[0_0_10px_rgba(255,0,0,0.3)] select-none h-9">
                                <ShieldCheck size={12} />
                                ADMIN
                            </div>
                        )}
                        <button
                            onClick={(e) => {
                                e.preventDefault();
                                audioService.playSE('click');
                                setShowUserMenu(true);
                            }}
                            className="flex items-center gap-2 pl-2 pr-4 py-1 bg-gray-900/50 border border-white/20 rounded-full hover:bg-white/10 hover:border-neon-blue/50 backdrop-blur-md transition-all active:scale-95 h-9"
                        >
                            {user.photoURL ? (
                                <img src={user.photoURL} className="w-6 h-6 rounded-full border border-white/20" />
                            ) : (
                                <UserIcon size={16} className="text-neon-blue" />
                            )}
                            <span className="font-bold text-sm text-gray-200 group-hover:text-white">
                                {user.displayName || 'Player'}
                            </span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={() => { audioService.playSE('click'); setShowAuthDialog(true); }}
                        className="px-6 py-1.5 bg-white/10 border border-white/20 rounded-full hover:bg-white/20 backdrop-blur-md font-bold text-sm text-white/90 hover:text-white transition-all"
                    >
                        LOGIN
                    </button>
                )}
            </div>

            {/* Dialogs */}
            <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />

            <UserMenuDialog
                isOpen={showUserMenu}
                onClose={() => setShowUserMenu(false)}
                onOpenAdmin={() => { setShowUserMenu(false); setShowAdminPanel(true); }}
            />

            <AdminManagementDialog isOpen={showAdminPanel} onClose={() => setShowAdminPanel(false)} />

            {/* Settings Dialog */}
            {showSettings && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
                    <div className="bg-gray-900/90 border border-white/20 rounded-2xl w-full max-w-sm shadow-[0_0_40px_rgba(0,0,0,0.6)] p-8 relative backdrop-blur-xl">
                        <div className="flex justify-between items-center mb-10 border-b border-white/10 pb-4">
                            <h2 className="text-2xl font-black text-white flex items-center gap-3 tracking-widest italic">
                                <Settings size={24} className="text-neon-blue animate-spin-slow" /> SETTINGS
                            </h2>
                            <button onClick={() => { audioService.playSE('click'); setShowSettings(false); }} className="text-gray-400 hover:text-white hover:rotate-90 transition-all duration-300">
                                <X size={28} />
                            </button>
                        </div>

                        <div className="space-y-8">
                            {/* BGM Volume */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-3 text-sm font-bold text-gray-300 tracking-wider">
                                        <Volume2 size={18} className="text-neon-pink" /> BGM
                                    </span>
                                    <span className="text-neon-pink font-mono font-bold bg-neon-pink/10 px-2 py-0.5 rounded text-xs">{Math.round(bgmVolume)}%</span>
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
                                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-pink hover:accent-neon-pink/80 transition-all"
                                />
                            </div>

                            {/* SE Volume */}
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-3 text-sm font-bold text-gray-300 tracking-wider">
                                        <Volume2 size={18} className="text-neon-blue" /> SE
                                    </span>
                                    <span className="text-neon-blue font-mono font-bold bg-neon-blue/10 px-2 py-0.5 rounded text-xs">{Math.round(seVolume)}%</span>
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
                                    className="w-full h-1.5 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-neon-blue hover:accent-neon-blue/80 transition-all"
                                />
                            </div>

                            {/* Fullscreen Toggle */}
                            <div className="pt-4 border-t border-white/10">
                                <div className="flex justify-between items-center">
                                    <span className="flex items-center gap-3 text-sm font-bold text-gray-300 tracking-wider">
                                        <Maximize size={18} className="text-neon-green" /> FULLSCREEN
                                    </span>
                                    <button
                                        onClick={() => {
                                            audioService.playSE('click');
                                            if (!document.fullscreenElement) {
                                                document.documentElement.requestFullscreen();
                                            } else {
                                                document.exitFullscreen();
                                            }
                                        }}
                                        className={`w-14 h-7 rounded-full transition-colors relative shadow-inner ${document.fullscreenElement ? 'bg-neon-green' : 'bg-gray-800 border border-gray-700'}`}
                                    >
                                        <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform shadow-md ${document.fullscreenElement ? 'translate-x-7' : 'translate-x-0'}`} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="mt-10 text-center">
                            <button
                                onClick={() => { audioService.playSE('click'); setShowSettings(false); }}
                                className="w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-sm font-bold transition-all hover:scale-[1.02] tracking-widest text-gray-400 hover:text-white"
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
