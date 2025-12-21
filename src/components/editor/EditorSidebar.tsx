import React, { useState } from 'react';
import { Play, Square, Settings, HelpCircle, Target, Circle, Trash2, Plus, Ban, RotateCcw, RotateCw, RefreshCw, AlertTriangle, Save, FolderOpen, Download, FolderInput, CloudUpload, User as UserIcon, ShieldCheck } from 'lucide-react';
import { ADMIN_UIDS } from '../../constants/admin';
import type { InteractionMode } from '../game/GameCanvas';
import type { LevelConfig } from '../../types/Level';
import { MathInput } from '../math/MathInput';
import { ObjectInspector } from './ObjectInspector';
import { SettingsPanel } from './SettingsPanel';
import { MathEngine } from '../../core/math/MathEngine';
import { LevelManager } from '../../utils/LevelManager';
import { LevelLoadDialog } from './LevelLoadDialog';
import { LevelSaveDialog } from './LevelSaveDialog';
import { AuthDialog } from './AuthDialog';
import { LevelPublishDialog } from './LevelPublishDialog';

import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signOutUser } from '../../services/firebase';
import { audioService } from '../../services/AudioService';




interface EditorSidebarProps {
    level: LevelConfig;
    setLevel: React.Dispatch<React.SetStateAction<LevelConfig>>;
    mode: InteractionMode;
    setMode: (m: InteractionMode) => void;
    selectedId: string | null;
    setSelectedId: (id: string | null) => void;

    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    reset: (v: LevelConfig) => void;
    DEFAULT_LEVEL: LevelConfig;
    resetView: () => void;

    testF: string;
    setTestF: (s: string) => void;

    snapStep: number;
    setSnapStep: (n: number) => void;

    gameState: { isPlaying: boolean; status: string }; // Simplified
    handleTogglePlay: () => void;
    stopGame: () => void;
    onHelpClick: () => void;

    isVerifying: boolean;
    setIsVerifying: (v: boolean) => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
    level, setLevel, mode, setMode, selectedId, setSelectedId,
    undo, redo, canUndo, canRedo, reset, DEFAULT_LEVEL, resetView,
    testF, setTestF,
    snapStep, setSnapStep,
    gameState, handleTogglePlay, stopGame,
    onHelpClick,
    isVerifying, setIsVerifying
}) => {
    const [showSettings, setShowSettings] = useState(false);
    const [user, setUser] = useState<User | null>(null);
    const [showAuthDialog, setShowAuthDialog] = useState(false);
    const [showPublishDialog, setShowPublishDialog] = useState(false);
    const [solution, setSolution] = useState<string | null>(null);
    // isVerifying is now a prop

    const isAdmin = user && ADMIN_UIDS.includes(user.uid);

    // Auth State Observer
    React.useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (u) => {
            setUser(u);
        });
        return () => unsubscribe();
    }, []);

    // Track Clear State and Solution
    React.useEffect(() => {
        if (gameState.status === 'won' || gameState.status === 'clear') {
            if (isVerifying) {
                console.log("Verification Success! Opening Dialog.");
                // Verification successful
                setSolution(testF);
                if (gameState.isPlaying) {
                    handleTogglePlay(); // Stop playing
                }
                setShowPublishDialog(true);
            } else {
                setSolution(testF);
            }
        } else if (gameState.status === 'edit') {
            // User stopped or reset
            if (isVerifying) {
                setIsVerifying(false);
            }
        }
    }, [gameState.status, testF, isVerifying]);

    // Reset solution when level changes significantly (optional, but good practice)
    React.useEffect(() => {
        setSolution(null);
        setIsVerifying(false);
    }, [level.id]);

    const handleLogin = () => {
        setShowAuthDialog(true);
    };

    const handleLogout = async () => {
        if (confirm("Logout?")) {
            await signOutUser();
        }
    };

    const handlePublishClick = () => {
        console.log("Publish Clicked. User:", user);
        if (!user) {
            setShowAuthDialog(true);
            return;
        }

        // 1. Start Verification Play
        if (confirm("To publish, you must first clear the level yourself to prove it's solvable.\n\nStart Verification Play?")) {
            console.log("Starting Verification Play...");
            setIsVerifying(true);
            setSolution(null);
            if (!gameState.isPlaying) {
                console.log("Switching to Play Mode");
                handleTogglePlay();
            }
        }
    };

    // Compile g to check validity
    const gFunc = MathEngine.compile(level.g_raw || '');
    const onGChange = (val: string) => setLevel(prev => ({ ...prev, g_raw: val }));

    const handleResetLevel = () => {
        if (confirm("Reset layout to default? History will be cleared.")) {
            reset(DEFAULT_LEVEL);
            setTestF('0');
            resetView();
            setSolution(null);
            setIsVerifying(false);
        }
    };

    // Refs for auto-scroll
    const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

    // Auto-scroll to selected item
    React.useEffect(() => {
        if (selectedId && itemRefs.current[selectedId]) {
            itemRefs.current[selectedId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }, [selectedId]);

    const handlePointUpdate = (targetId: string, field: 'x' | 'y', valStr: string) => {
        let val = NaN;
        try {
            const f = MathEngine.compile(valStr);
            if (f.isValid) {
                val = f.compiled({ x: 0, y: 0, t: 0, T: 0 });
            }
        } catch { val = NaN; }

        const rangeProp = field === 'x' ? 'xFormula' : 'yFormula';
        const updatePoint = (obj: any) => ({
            ...obj,
            [field]: isNaN(val) ? obj[field] : val,
            [rangeProp]: valStr
        });

        setLevel(prev => {
            if (targetId === 'start') return { ...prev, startPoint: updatePoint(prev.startPoint) }; // Should not use formula for start? But method is generic. We used specific handler for start in JSX. This function is for Goal/WP.
            if (targetId === 'goal') return { ...prev, goalPoint: updatePoint(prev.goalPoint) };
            if (targetId.startsWith('wp_')) {
                const idx = parseInt(targetId.split('_')[1]);
                const newWps = [...prev.waypoints];
                if (newWps[idx]) newWps[idx] = updatePoint(newWps[idx]);
                return { ...prev, waypoints: newWps };
            }
            return prev;
        });
    };

    const handleDeleteItem = (id: string) => {
        if (!id) return;
        if (id.startsWith('wp_')) {
            const idx = parseInt(id.split('_')[1]);
            setLevel(prev => ({
                ...prev,
                waypoints: prev.waypoints.filter((_, i) => i !== idx)
            }));
        } else {
            // Try to delete shape
            setLevel(prev => ({
                ...prev,
                shapes: (prev.shapes || []).filter(s => s.id !== id)
            }));
        }
        if (selectedId === id) setSelectedId(null);
    };

    const handleDeleteSelected = () => { // Keep for ObjectInspector prop
        if (selectedId) handleDeleteItem(selectedId);
    };

    // ... (rest is constraint logic)

    const updateConstraint = (groupIndex: number, condIndex: number, val: string) => {
        setLevel(prev => {
            const newConstraints = [...prev.constraints];
            // Copy the group
            const newGroup = [...newConstraints[groupIndex]];
            newGroup[condIndex] = val;
            newConstraints[groupIndex] = newGroup;
            return { ...prev, constraints: newConstraints };
        });
    };

    const addConstraintGroup = () => {
        // Add a new group with a visible default condition
        setLevel(prev => ({ ...prev, constraints: [...prev.constraints, ['x > 5']] }));
    };

    const removeConstraintGroup = (index: number) => {
        setLevel(prev => ({
            ...prev,
            constraints: prev.constraints.filter((_, i) => i !== index)
        }));
    };

    const addConstraintCondition = (groupIndex: number) => {
        setLevel(prev => {
            const newConstraints = [...prev.constraints];
            newConstraints[groupIndex] = [...newConstraints[groupIndex], ''];
            return { ...prev, constraints: newConstraints };
        });
    };

    const removeConstraintCondition = (groupIndex: number, condIndex: number) => {
        setLevel(prev => {
            const newConstraints = [...prev.constraints];
            const newGroup = newConstraints[groupIndex].filter((_, i) => i !== condIndex);

            // If group becomes empty, should we remove the group? 
            // Maybe strict user action is better. But let's keep empty group if user just deleted a condition.
            newConstraints[groupIndex] = newGroup;
            return { ...prev, constraints: newConstraints };
        });
    };


    // File Handling
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const [showLoadDialog, setShowLoadDialog] = useState(false);
    const [showSaveDialog, setShowSaveDialog] = useState(false);

    const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const json = ev.target?.result as string;
            if (json) {
                const loaded = LevelManager.parseJSON(json);
                if (loaded) {
                    if (confirm("Load level? Current unsaved changes will be lost.")) {
                        reset(loaded);
                    }
                } else {
                    alert("Failed to load level.");
                }
            }
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleSaveConfirm = (name: string, memo: string, difficulty: string, saveAsNew: boolean) => {
        let newId = level.id;
        // Generate new ID if strictly 'draft' OR if user explicitly asks to save as new
        if (newId === 'draft' || saveAsNew) {
            newId = 'lvl_' + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
        }

        const levelToSave = {
            ...level,
            id: newId,
            name,
            description: memo,
            difficulty
        };

        setLevel(prev => ({
            ...prev,
            id: newId,
            name,
            description: memo,
            difficulty
        }));

        if (LevelManager.saveToLocalStorage(levelToSave)) {
            alert("Level Saved to Browser Storage!");
            setShowSaveDialog(false);
        } else {
            alert("Failed to save.");
        }
    };


    const handleLoadConfirm = (loadedLevel: LevelConfig) => {
        if (confirm("Load level? Current unsaved changes will be lost.")) {
            // Ensure deep clone to avoid mutation issues
            const cloned = JSON.parse(JSON.stringify(loadedLevel));
            reset(cloned);
            setTestF('0');
            setSolution(null);
            setIsVerifying(false);
            setShowLoadDialog(false);
        }
    };

    return (
        <>
            <LevelPublishDialog
                isOpen={showPublishDialog}
                level={level}
                user={user}
                solution={solution}
                onClose={() => {
                    setShowPublishDialog(false);
                    setIsVerifying(false);
                    stopGame(); // Reset to idle so CLEAR screen doesn't show
                }}
            />
            <LevelSaveDialog
                isOpen={showSaveDialog}
                initialName={level.name}
                initialMemo={level.description}
                initialDifficulty={level.difficulty}
                onClose={() => setShowSaveDialog(false)}
                onSave={handleSaveConfirm}
            />
            <LevelLoadDialog
                isOpen={showLoadDialog}
                onClose={() => setShowLoadDialog(false)}
                onLoad={handleLoadConfirm}
            />
            <AuthDialog isOpen={showAuthDialog} onClose={() => setShowAuthDialog(false)} />
            <div className="w-96 bg-neon-surface/90 border-r border-neon-blue/30 flex flex-col backdrop-blur-md z-10 transition-all duration-300 relative h-full">

                {/* Scrollable Main Content - Disabled when verifying/playing */}
                <div className={`flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-6 ${gameState.isPlaying ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                    {/* Header & Tools */}
                    <div className="flex justify-between items-center mb-2">
                        {/* User Profile (Left) */}
                        <div>
                            {user ? (
                                <button onClick={() => { audioService.playSE('click'); handleLogout(); }} className="flex items-center gap-2 px-3 py-1.5 bg-neon-blue/20 border border-neon-blue/50 rounded text-xs text-neon-blue hover:bg-neon-blue/30 transition-colors" title="Logout">
                                    {user.photoURL ? <img src={user.photoURL} className="w-5 h-5 rounded-full" /> : <UserIcon size={16} />}
                                    <span className="max-w-[80px] truncate font-bold">{user.displayName}</span>
                                    {isAdmin && <ShieldCheck size={14} className="text-red-500 ml-1" />}
                                </button>
                            ) : (
                                <button onClick={() => { audioService.playSE('click'); handleLogin(); }} className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 border border-gray-600 rounded text-xs text-white hover:bg-gray-700 transition-colors" title="Login with Google">
                                    <UserIcon size={16} /> <span className="font-bold">Login</span>
                                </button>
                            )}
                        </div>

                        {/* Editor Tools (Right) */}
                        <div className="flex gap-1 items-center">
                            <button onClick={() => { audioService.playSE('click'); undo(); }} disabled={!canUndo} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 transition-colors" title="Undo"><RotateCcw size={16} /></button>
                            <button onClick={() => { audioService.playSE('click'); redo(); }} disabled={!canRedo} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 transition-colors" title="Redo"><RotateCw size={16} /></button>
                            <div className="w-1 h-6 bg-white/10 mx-1 rounded"></div>
                            <button onClick={() => { audioService.playSE('click'); handleResetLevel(); }} className="p-2 bg-gray-800 rounded hover:bg-red-900/50 text-red-400 hover:text-red-300 transition-colors" title="Reset Level"><RefreshCw size={16} /></button>
                            <button onClick={() => { audioService.playSE('click'); setShowSettings(!showSettings); }} className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors" title="Settings"><Settings size={16} /></button>
                            <button onClick={() => { audioService.playSE('click'); onHelpClick(); }} className="p-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors" title="Help"><HelpCircle size={16} /></button>
                        </div>
                    </div>


                    {/* File Menu */}
                    <div className="bg-black/40 p-2 rounded border border-white/5 flex gap-2">
                        <button onClick={() => { audioService.playSE('click'); setShowSaveDialog(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white p-2 rounded text-xs flex flex-col items-center gap-1 border border-white/10" title="Quick Save to Browser">
                            <Save size={16} className="text-neon-blue" /> <span>Save</span>
                        </button>
                        <button onClick={() => { audioService.playSE('click'); setShowLoadDialog(true); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white p-2 rounded text-xs flex flex-col items-center gap-1 border border-white/10" title="Load from Browser">
                            <FolderOpen size={16} className="text-neon-yellow" /> <span>Load</span>
                        </button>

                        <div className="w-[1px] bg-white/20 mx-1"></div>

                        <button onClick={() => { audioService.playSE('click'); LevelManager.exportToJSON(level); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white p-2 rounded text-xs flex flex-col items-center gap-1 border border-white/10" title="Download JSON to file">
                            <Download size={16} className="text-neon-green" /> <span>Download</span>
                        </button>
                        <button onClick={() => { audioService.playSE('click'); fileInputRef.current?.click(); }} className="flex-1 bg-white/5 hover:bg-white/10 text-white p-2 rounded text-xs flex flex-col items-center gap-1 border border-white/10" title="Import JSON from file">
                            <FolderInput size={16} className="text-pink-400" /> <span>Import</span>
                        </button>

                        <button onClick={() => { audioService.playSE('click'); handlePublishClick(); }} className="flex-1 bg-neon-purple/20 hover:bg-neon-purple/40 text-neon-purple p-2 rounded text-xs flex flex-col items-center gap-1 border border-neon-purple/30 aspect-square" title="Publish to Online">
                            <CloudUpload size={16} /> <span>Publish</span>
                        </button>

                        <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleImport} />
                    </div>


                    {/* Current Action Indicator */}
                    {mode !== 'select' && (
                        <div className="bg-neon-blue/10 border border-neon-blue/30 rounded p-2 text-center animate-in fade-in slide-in-from-top-2">
                            <span className="text-neon-blue text-sm font-bold">
                                {mode === 'add_waypoint' ? 'Click to add Waypoint' : mode === 'create_rect' ? 'Drag to create Rectangle' : mode === 'create_circle' ? 'Drag to create Circle' : ''}
                            </span>
                        </div>
                    )}

                    {/* Settings Modal */}
                    {showSettings && (
                        <SettingsPanel snapStep={snapStep} setSnapStep={setSnapStep} level={level} setLevel={setLevel} />
                    )}

                    {/* Selected Object Inspector */}
                    <ObjectInspector
                        selectedId={selectedId}
                        level={level}
                        setLevel={setLevel}
                        handleDeleteSelected={handleDeleteSelected}
                        snapStep={snapStep}
                    />

                    {/* Function Section */}
                    <div className="bg-neon-surface/50 p-2 rounded border border-white/10">
                        <label className="text-xs text-neon-blue font-bold mb-1 block">Game Function g(f)(x)</label>
                        <div className="text-[10px] text-gray-400 mb-1">Use 'f' for previous function, 'x', 't', 'X'</div>
                        <MathInput
                            value={level.g_raw || ''}
                            onChange={onGChange}
                        />
                        {!gFunc.isValid && (
                            <div className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                {gFunc.error || "Invalid Expression"}
                            </div>
                        )}



                    </div>

                    <div className="mt-4">
                        <label className="text-gray-400 text-sm mb-1 block">Test f(x) (Player)</label>
                        <MathInput value={testF} onChange={setTestF} />
                    </div>

                    {/* Forbidden Areas */}
                    <div className="border-t border-white/10 pt-4">
                        <h3 className="text-red-500 font-bold mb-3 flex items-center gap-2"><Ban size={18} /> Forbidden Areas</h3>

                        <div className="grid grid-cols-2 gap-2 mb-4">
                            <button onClick={() => { audioService.playSE('click'); setMode('create_rect'); }} className={`p-2 rounded border flex items-center gap-2 justify-center text-xs transition-all ${mode === 'create_rect' ? 'bg-red-500 text-black border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-solid hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]'} `}>
                                <Square size={14} /> Rect
                            </button>
                            <button onClick={() => { audioService.playSE('click'); setMode('create_circle'); }} className={`p-2 rounded border flex items-center gap-2 justify-center text-xs transition-all ${mode === 'create_circle' ? 'bg-red-500 text-black border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-solid hover:shadow-[0_0_10px_rgba(239,68,68,0.2)]'} `}>
                                <Circle size={14} /> Circle
                            </button>
                        </div>



                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-xs text-gray-400">
                                <span>Forbidden Areas (Inequalities)</span>
                            </div>
                            <button onClick={() => { audioService.playSE('click'); addConstraintGroup(); }} className="w-full py-2 border border-dashed border-red-500/50 text-red-500 hover:bg-red-500/10 hover:border-solid rounded flex items-center justify-center gap-2 text-xs transition-all shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/20">
                                <Plus size={14} /> Add Forbidden Area
                            </button>

                            {level.constraints.map((group, groupIndex) => (
                                <div key={groupIndex} className="bg-white/5 rounded p-2 border border-white/10">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider">Area {groupIndex + 1} (match ALL)</span>
                                        <button onClick={() => { audioService.playSE('click'); removeConstraintGroup(groupIndex); }} className="text-red-500 hover:text-red-400 text-xs"><Trash2 size={12} /></button>
                                    </div>
                                    <div className="space-y-2 pl-2 border-l border-white/10 ml-1">
                                        {group.map((condition, condIndex) => (
                                            <div key={condIndex} className="flex gap-2 items-center">
                                                <div className="flex-1">
                                                    <MathInput value={condition} onChange={v => updateConstraint(groupIndex, condIndex, v)} />
                                                </div>
                                                <button onClick={() => { audioService.playSE('click'); removeConstraintCondition(groupIndex, condIndex); }} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                            </div>
                                        ))}
                                        <button onClick={() => { audioService.playSE('click'); addConstraintCondition(groupIndex); }} className="text-xs text-gray-500 hover:text-neon-blue flex items-center gap-1">
                                            <Plus size={10} /> AND Condition
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </div>

                    {/* Objects Section */}
                    <div className="border-t border-white/10 pt-4 pb-4">
                        <h3 className="text-neon-blue font-bold mb-3 flex items-center gap-2"><Target size={18} /> Objects</h3>

                        <div className="flex flex-col gap-4">
                            {/* Waypoints List */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-xs text-gray-400 font-bold">Waypoints</label>
                                </div>
                                <button onClick={() => { audioService.playSE('click'); setMode('add_waypoint'); }} className={`w-full py-2 rounded border flex items-center justify-center gap-2 text-xs transition-all ${mode === 'add_waypoint' ? 'bg-neon-blue text-black border-neon-blue shadow-[0_0_15px_rgba(0,255,255,0.5)]' : 'border-dashed border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10 hover:border-solid hover:shadow-[0_0_10px_rgba(0,255,255,0.2)]'}`}>
                                    <Plus size={14} /> Add Waypoint
                                </button>

                                {level.waypoints.map((wp, i) => {
                                    const id = `wp_${i}`;
                                    const isSelected = selectedId === id;
                                    return (
                                        <div
                                            key={id}
                                            ref={el => { itemRefs.current[id] = el; }}
                                            className={`p-2 rounded border ${isSelected ? 'bg-neon-blue/10 border-neon-blue' : 'bg-white/5 border-white/10'} transition-colors`}
                                            onClick={() => setSelectedId(id)}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className={`text-xs font-bold ${isSelected ? 'text-neon-blue' : 'text-gray-400'}`}>WP #{i + 1}</span>
                                                <button onClick={(e) => { e.stopPropagation(); audioService.playSE('click'); handleDeleteItem(id); }} className="text-gray-600 hover:text-red-500"><Trash2 size={12} /></button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-1 mb-1">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-500 w-3 text-center">X</span>
                                                    <div className="flex-1">
                                                        <MathInput
                                                            value={wp.xFormula ?? String(wp.x)}
                                                            onChange={v => handlePointUpdate(id, 'x', v)}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[10px] text-gray-500 w-3 text-center">Y</span>
                                                    <div className="flex-1">
                                                        <MathInput
                                                            value={wp.yFormula ?? String(wp.y)}
                                                            onChange={v => handlePointUpdate(id, 'y', v)}
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 w-3 text-center">R</span>
                                                <input
                                                    type="number" step="0.1" min="0.1"
                                                    className="flex-1 bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-white focus:border-neon-blue focus:outline-none"
                                                    value={wp.radius ?? 0.1}
                                                    onChange={(e) => {
                                                        const val = Math.max(0.1, parseFloat(e.target.value));
                                                        const newWps = [...level.waypoints];
                                                        newWps[i] = { ...newWps[i], radius: val };
                                                        setLevel(prev => ({ ...prev, waypoints: newWps }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                                {level.waypoints.length === 0 && <div className="text-[10px] text-gray-600 italic text-center py-2">No waypoints</div>}
                            </div>

                            {/* Start Point (Static) */}
                            <div
                                ref={el => { itemRefs.current['start'] = el; }}
                                className={`p-2 rounded border ${selectedId === 'start' ? 'bg-neon-green/10 border-neon-green' : 'bg-white/5 border-white/10'} transition-colors`}
                                onClick={() => setSelectedId('start')}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold ${selectedId === 'start' ? 'text-neon-green' : 'text-gray-400'}`}>START POINT</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">X</span>
                                        <input
                                            type="number" step={snapStep}
                                            className="w-full bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-white focus:border-neon-green focus:outline-none"
                                            value={level.startPoint.x}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                setLevel(prev => ({ ...prev, startPoint: { ...prev.startPoint, x: v } })); // No formula
                                            }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">Y</span>
                                        <input
                                            type="number" step={snapStep}
                                            className="w-full bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-white focus:border-neon-green focus:outline-none"
                                            value={level.startPoint.y}
                                            onChange={(e) => {
                                                const v = parseFloat(e.target.value);
                                                setLevel(prev => ({ ...prev, startPoint: { ...prev.startPoint, y: v } })); // No formula
                                            }}
                                        />
                                    </div>
                                </div>
                                {/* Start Radius removed per spec, or kept? User said "Start... dynamic rendering...". Reverted radius. */}
                            </div>

                            {/* Goal Point (Dynamic) */}
                            <div
                                ref={el => { itemRefs.current['goal'] = el; }}
                                className={`p-2 rounded border ${selectedId === 'goal' ? 'bg-neon-yellow/10 border-neon-yellow' : 'bg-white/5 border-white/10'} transition-colors`}
                                onClick={() => setSelectedId('goal')}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={`text-xs font-bold ${selectedId === 'goal' ? 'text-neon-yellow' : 'text-gray-400'}`}>GOAL POINT</span>
                                </div>
                                <div className="grid grid-cols-1 gap-1 mb-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500 w-3 text-center">X</span>
                                        <div className="flex-1">
                                            <MathInput
                                                value={level.goalPoint.xFormula ?? String(level.goalPoint.x)}
                                                onChange={v => handlePointUpdate('goal', 'x', v)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500 w-3 text-center">Y</span>
                                        <div className="flex-1">
                                            <MathInput
                                                value={level.goalPoint.yFormula ?? String(level.goalPoint.y)}
                                                onChange={v => handlePointUpdate('goal', 'y', v)}
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-500 w-3 text-center">R</span>
                                    <input
                                        type="number" step="0.1" min="0.1"
                                        className="flex-1 bg-black/30 border border-white/10 rounded px-1 py-0.5 text-xs text-white focus:border-neon-yellow focus:outline-none"
                                        value={level.goalRadius ?? 0.5}
                                        onChange={(e) => setLevel(prev => ({ ...prev, goalRadius: parseFloat(e.target.value) || 0.1 }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shapes Inspector */}
                    <ObjectInspector
                        selectedId={selectedId && !selectedId.startsWith('wp_') && selectedId !== 'start' && selectedId !== 'goal' ? selectedId : null}
                        level={level}
                        setLevel={setLevel}
                        handleDeleteSelected={handleDeleteSelected}
                        snapStep={snapStep}
                    />

                    {/* Level Settings (Speed) */}
                    <div className="border-t border-white/10 pt-4 pb-4">
                        <div className="flex items-center gap-2 bg-white/5 rounded border border-white/10 p-2">
                            <Settings size={14} className="text-gray-400" />
                            <span className="text-gray-400 text-xs">Player Speed</span>
                            <input
                                type="number"
                                value={level.playerSpeed ?? 5.0}
                                onChange={(e) => setLevel(l => ({ ...l, playerSpeed: parseFloat(e.target.value) || 1.0 }))}
                                step={0.5}
                                min={0.5}
                                className="bg-transparent text-white text-xs w-full focus:outline-none text-right"
                            />
                        </div>
                    </div>
                </div>

                {/* Play Button - Always Interactive */}
                <div className="p-4 shadow-lg bg-black border-t border-white/10 shrink-0 z-20">
                    <button
                        onClick={handleTogglePlay}
                        className={`w-full py-3 font-bold rounded shadow-[0_0_10px_rgba(255,0,255,0.4)] flex items-center justify-center gap-2 transition-all ${gameState.isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-neon-pink text-black hover:bg-neon-pink/80'
                            }`}
                    >
                        {gameState.isPlaying ? <><Square size={20} fill="white" /> STOP</> : <><Play size={20} fill="black" /> DEMOPLAY</>}
                    </button>
                </div>
            </div>
        </>
    );
};
