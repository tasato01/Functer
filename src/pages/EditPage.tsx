import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { GameCanvas } from '../components/game/GameCanvas';
import type { InteractionMode } from '../components/game/GameCanvas';

import { EMPTY_LEVEL } from '../types/Level';
import type { LevelConfig, Point, CircleConstraint, RectConstraint } from '../types/Level';
import { MathEngine } from '../core/math/MathEngine';
import { useGameLoop } from '../hooks/useGameLoop';
import { EditorSidebar } from '../components/editor/EditorSidebar';
import { Move, Home } from 'lucide-react';
import { HelpDialog } from '../components/common/HelpDialog';
import { audioService } from '../services/AudioService';

// ... (useHistory hook remains unchanged)
function useHistory<T>(initialState: T) {
    const [history, setHistory] = useState<T[]>([initialState]);
    const [index, setIndex] = useState(0);

    const state = history[index];

    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        setHistory(prevHist => {
            const current = prevHist[index];
            const val = typeof newState === 'function' ? (newState as any)(current) : newState;
            const newHist = prevHist.slice(0, index + 1);
            newHist.push(val);
            return newHist;
        });
        setIndex(prev => prev + 1);
    }, [index]);

    const undo = useCallback(() => {
        setIndex(prev => Math.max(0, prev - 1));
    }, []);

    const redo = useCallback(() => {
        setHistory(prev => {
            setIndex(idx => Math.min(prev.length - 1, idx + 1));
            return prev;
        });
    }, []);

    const reset = useCallback((val: T) => {
        setHistory([val]);
        setIndex(0);
    }, []);

    return { state, setState, undo, redo, canUndo: index > 0, canRedo: index < history.length - 1, reset };
}

export const EditPage: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { state: level, setState: setLevel, undo, redo, canUndo, canRedo, reset } = useHistory<LevelConfig>(EMPTY_LEVEL);

    const [testF, setTestF] = useState('0'); // Default 0
    const [snapStep, setSnapStep] = useState(0.5); // Default 0.5

    // View State
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(40);

    // Interaction State
    const [mode, setMode] = useState<InteractionMode>('select');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [showHelp, setShowHelp] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false); // Verification for Publish

    const fFn = useMemo(() => MathEngine.compile(testF), [testF]);
    const gFn = useMemo(() => MathEngine.compile(level.g_raw), [level.g_raw]);

    const { gameState, startGame, stopGame } = useGameLoop(fFn, gFn, level);

    // Initialize/Reset on mount
    useEffect(() => {
        const state = location.state as { initialLevel?: LevelConfig } | undefined;

        if (state?.initialLevel) {
            // Load Copied Level
            const loaded = JSON.parse(JSON.stringify(state.initialLevel));
            // IMPORTANT: If we want to "Copy", we must strip ID and author
            // If it's "My Level Edit" (from previous task), we might want to keep ID?
            // The previous code in LevelBrowser for "My Levels" sent `initialLevel: level`.
            // For now, let's assume we WANT to strip ID if it's a copy action.
            // But if it's "Edit" action from MY LEVEL, we might want to keep it?

            // Current Plan: LevelBrowser sends explicit intent? No, just the level object.
            // User requirement: "Copy any existing level".
            // If I open "My Level" with the same button, it acts as edit (maybe).
            // But `publishLevel` always creates NEW doc currently.
            // So practically EVERYTHING is a "Copy" right now until we implement `updateLevel`.

            // So: Clean it up to be safe for "New Level" flow.
            // But wait, if I want to "Edit My Level", I might be annoyed if it creates a duplicate.
            // However, implementing Update is "Edit & Republish" task.
            // The current task is "Copy".
            // I'll make sure it's at least loaded.
            // If I strip ID here, even "My Levels" will be copies.
            // That's safer for MVP to avoid accidental overwrites of Official levels.

            // Let's Clean metadata
            // loaded.id = undefined; // Actually keep it? No, strip it so publishing makes new.
            // Wait, if I strip it, `LevelSaveDialog` or `FirebaseLevelService` will treat as new.
            // If I keep it, `publishLevel` might overwrite if I change logic there.
            // Currently `publishLevel` uses `addDoc`. So even if I keep ID, it makes new doc.
            // So it's effectively always "Copy".

            // Just ensure we don't carry over weird state.
            loaded.plays = 0;
            loaded.likes = 0;
            loaded.isOfficial = false; // Always become user level on copy

            // If it's NOT my level, I should definitely strip ID and author.
            // But logic to check "is my level" is not inside EditPage easily without Auth check.
            // Let's just strip ID to be consistent with "Copy" behavior for now.
            // The user explicitly asked for "Copy".
            // For "My Levels Edit", they might expect "Update", but "Copy" is a safe fallback.

            delete loaded.id;
            delete loaded.authorId;
            delete loaded.authorName;
            delete loaded.createdAt;

            reset(loaded);
        } else {
            // Default New
            // Deep clone to ensure fresh start and no mutation of global default
            const cleanLevel = JSON.parse(JSON.stringify(EMPTY_LEVEL));
            reset(cleanLevel);
        }

        setTestF('0');
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'math-field') return;

            if (e.key === 'Delete' || e.key === 'Backspace') {
                handleDeleteSelected();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
                if (e.shiftKey) redo();
                else undo();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, level, undo, redo]); // eslint-disable-line react-hooks/exhaustive-deps

    // Mobile Viewport Height Fix
    const [viewportHeight, setViewportHeight] = useState(window.innerHeight);



    useEffect(() => {
        const updateHeight = () => {
            if (window.visualViewport) {
                setViewportHeight(window.visualViewport.height);
            } else {
                setViewportHeight(window.innerHeight);
            }
        };

        // Initial update
        updateHeight();

        window.addEventListener('resize', updateHeight);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', updateHeight);
        }

        return () => {
            window.removeEventListener('resize', updateHeight);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', updateHeight);
            }
        };
    }, []);

    const handleTogglePlay = () => {
        audioService.playSE('play');
        if (gameState.isPlaying) {
            stopGame();
        } else {
            if (!fFn.isValid || !gFn.isValid) {
                alert("Functions are invalid!");
                return;
            }
            const sx = level.startPoint.x;
            const sy = level.startPoint.y;
            let gy = 0;
            try {
                // Use evaluateChain to ensure consistent scope (including derivative_f)
                gy = MathEngine.evaluateChain(gFn, fFn, sx, 0);
            } catch { gy = NaN; }

            if (Math.abs(sy - gy) > 0.1) {
                alert(`Cannot start! \nStart Point (${sy.toFixed(2)}) is not on the function graph (${gy.toFixed(2)}).\nDifference must be within ±0.1.`);
                return;
            }
            startGame();
        }
    };

    const resetView = useCallback(() => {
        const cx = (level.startPoint.x + level.goalPoint.x) / 2;
        const cy = (level.startPoint.y + level.goalPoint.y) / 2;
        setViewOffset({ x: -cx * scale, y: cy * scale });
    }, [level, scale]);

    useEffect(() => {
        // Force balanced view on mount (or level change if desirable? No, just mount)
        // Actually if level is DEFAULT_LEVEL on mount...
        resetView();
    }, []); // eslint-disable-line react-hooks/exhaustive-deps



    const handleAddShape = (shape: CircleConstraint | RectConstraint) => {
        setLevel(prev => ({ ...prev, shapes: [...(prev.shapes || []), shape] }));
        setMode('select');
        setSelectedId(shape.id);
    };

    const handleDeleteSelected = () => {
        if (!selectedId) return;
        if (selectedId.startsWith('wp_')) {
            const idx = parseInt(selectedId.split('_')[1]);
            setLevel(prev => ({
                ...prev,
                waypoints: prev.waypoints.filter((_, i) => i !== idx)
            }));
        } else {
            // Try Shape
            const isShape = level.shapes?.some(s => s.id === selectedId);
            if (isShape) {
                setLevel(prev => ({
                    ...prev,
                    shapes: (prev.shapes || []).filter(s => s.id !== selectedId)
                }));
            }
        }
        setSelectedId(null);
    };



    const handleAddWaypoint = (p: Point) => {
        setLevel(prev => ({ ...prev, waypoints: [...prev.waypoints, p] }));
    };



    return (
        <div
            className="fixed inset-0 flex flex-col bg-black overflow-hidden"
            style={{ height: `${viewportHeight}px` }}
        >
            {/* Header / Nav (Consistent with PlayPage) */}
            <div className="h-14 bg-neon-surface/80 border-b border-neon-blue/30 flex items-center justify-between px-6 backdrop-blur-md z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold">
                        <Home size={16} /> HOME
                    </button>
                    {/* No list button for Editor */}
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <span className="text-gray-500 text-xs font-mono">EDITOR MODE</span>
                </div>



                <div className="w-[100px]"></div> {/* Spacer for balance */}
                <div className="fixed top-14 right-0 bg-red-600 text-white text-xs px-2 py-1 z-50 pointer-events-none opacity-50">
                    v1.1.1 (Debug)
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex relative overflow-hidden">
                {/* Sidebar */}
                <EditorSidebar
                    level={level}
                    setLevel={setLevel}
                    mode={mode}
                    setMode={setMode}
                    selectedId={selectedId}
                    setSelectedId={setSelectedId}
                    undo={undo}
                    redo={redo}
                    canUndo={canUndo}
                    canRedo={canRedo}
                    reset={reset}
                    DEFAULT_LEVEL={EMPTY_LEVEL}
                    resetView={resetView}
                    testF={testF}
                    setTestF={setTestF}
                    snapStep={snapStep}
                    setSnapStep={setSnapStep}
                    gameState={gameState}
                    handleTogglePlay={handleTogglePlay}
                    stopGame={stopGame}
                    onHelpClick={() => setShowHelp(true)}
                    isVerifying={isVerifying}
                    setIsVerifying={setIsVerifying}
                />

                {/* Main Graph Area */}
                <div className="flex-1 relative bg-black overflow-hidden relative group">
                    <div className="absolute top-4 left-4 z-20 flex gap-2">
                        <button onClick={resetView} className="p-2 bg-black/50 border border-white/20 rounded-full hover:bg-white/10 text-white transition-colors backdrop-blur-sm shadow-lg" title="Home Position">
                            <Move size={20} />
                        </button>
                    </div>

                    <GameCanvas
                        f={fFn}
                        g={gFn}
                        level={level}
                        t={gameState.isPlaying ? gameState.t : 0}
                        player={gameState.isPlaying ? { x: gameState.x, y: gameState.y } : undefined}
                        currentWaypointIndex={gameState.currentWaypointIndex}

                        viewOffset={viewOffset}
                        scale={scale}
                        onViewChange={(o, s) => { setViewOffset(o); setScale(s); }}

                        mode={mode}
                        onRightClick={() => setMode('select')} // Add this
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onLevelChange={newL => setLevel(newL)}
                        onShapeCreate={handleAddShape}
                        onWaypointCreate={handleAddWaypoint}

                        snapStep={snapStep}

                        className="w-full h-full"
                    />

                    {/* Modals ... */}
                    {/* Modals ... */}
                    <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />

                    {/* Game Status */}
                    {gameState.status !== 'idle' && gameState.status !== 'playing' && !isVerifying && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                            <div className="p-8 border-2 rounded-xl text-center bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] border-neon-blue">
                                <h2 className={`text-6xl font-black mb-2 ${gameState.status === 'won' ? 'text-neon-green' : 'text-red-500'}`}>
                                    {gameState.status === 'won' ? 'CLEAR!!' : 'FAILED'}
                                </h2>
                                <button onClick={() => { audioService.playSE('click'); stopGame(); }} className="mt-4 px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200">
                                    Close
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
