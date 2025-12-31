import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom'; // Added useLocation
import { GameCanvas } from '../components/game/GameCanvas';
import type { InteractionMode } from '../components/game/GameCanvas';

import { EMPTY_LEVEL } from '../types/Level';
import type { LevelConfig } from '../types/Level';
import { MathEngine } from '../core/math/MathEngine';
import { useGameLoop } from '../hooks/useGameLoop';
import { EditorSidebar } from '../components/editor/EditorSidebar';
import { Move, Home } from 'lucide-react';
import { HelpDialog } from '../components/common/HelpDialog';
import { audioService } from '../services/AudioService';

// ... (useHistory hook remains unchanged)
function useHistory<T>(initialState: T) {
    const [historyState, setHistoryState] = useState<{ history: T[], index: number }>({
        history: [initialState],
        index: 0
    });

    const state = historyState.history[historyState.index];

    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        setHistoryState(prev => {
            const current = prev.history[prev.index];
            const val = typeof newState === 'function' ? (newState as any)(current) : newState;
            const newHist = prev.history.slice(0, prev.index + 1);
            newHist.push(val);
            return {
                history: newHist,
                index: prev.index + 1
            };
        });
    }, []);

    const undo = useCallback(() => {
        setHistoryState(prev => ({
            ...prev,
            index: Math.max(0, prev.index - 1)
        }));
    }, []);

    const redo = useCallback(() => {
        setHistoryState(prev => ({
            ...prev,
            index: Math.min(prev.history.length - 1, prev.index + 1)
        }));
    }, []);

    const reset = useCallback((val: T) => {
        setHistoryState({
            history: [val],
            index: 0
        });
    }, []);

    return {
        state,
        setState,
        undo,
        redo,
        canUndo: historyState.index > 0,
        canRedo: historyState.index < historyState.history.length - 1,
        reset
    };
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

    const [refreshCount, setRefreshCount] = useState(0);


    const fFn = useMemo(() => MathEngine.compile(testF), [testF]);
    const gFn = useMemo(() => {
        // Compile default
        const defaultFn = MathEngine.compile(level.g_raw || '0');
        if (!level.gRules || level.gRules.length === 0) return defaultFn;

        // Compile rules
        const rules = level.gRules.map(r => ({
            fn: MathEngine.compile(r.expression),
            cond: MathEngine.compileCondition(r.condition || ''),
        }));

        // Return wrapped function
        return {
            ...defaultFn,
            compiled: (scope: any) => {
                for (const rule of rules) {
                    try {
                        if (rule.cond.evaluate(scope)) {
                            const res = rule.fn.compiled(scope);
                            return res; // MathEngine will cast to number later if needed
                        }
                    } catch { }
                }
                return defaultFn.compiled(scope);
            }
        };
    }, [level.g_raw, level.gRules]);

    const { gameState, startGame, stopGame, activeShapeIds } = useGameLoop(fFn, gFn, level);

    // ... (rest of code)

    const handleRightClick = useCallback(() => {
        if (selectedId) {
            setSelectedId(null);
            audioService.playSE('click');
        } else {
            setMode('select');
        }
    }, [selectedId]);

    // Initialize/Reset on mount
    useEffect(() => {
        const state = location.state as { initialLevel?: LevelConfig } | undefined;

        if (state?.initialLevel) {
            const loaded = JSON.parse(JSON.stringify(state.initialLevel));
            delete loaded.id;
            delete loaded.authorId;
            delete loaded.authorName;
            delete loaded.createdAt;
            reset(loaded);
        } else {
            const cleanLevel = JSON.parse(JSON.stringify(EMPTY_LEVEL));
            reset(cleanLevel);
        }

        setTestF('0');
        // eslint-disable-next-line react-hooks/exhaustive-deps
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
                // Use evaluateChain to ensure consistent scope
                gy = MathEngine.evaluateChain(gFn, fFn, sx, 0.01);
            } catch { gy = NaN; }

            // Ensure gy is a number for formatting
            const gyNum = Number(gy);

            if (isNaN(gyNum) || Math.abs(sy - gyNum) > 0.1) {
                const gyStr = Number.isNaN(gyNum) ? 'NaN' : gyNum.toFixed(2);
                alert(`Cannot start! \nStart Point (${sy.toFixed(2)}) is not on the function graph (${gyStr}).\nDifference must be within ±0.1.`);
                return;
            }
            startGame();
        }
    };

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
            if (e.code === 'Space') {
                e.preventDefault();
                handleTogglePlay();
            }
            if (e.code === 'KeyR') {
                e.preventDefault();
                setRefreshCount(c => c + 1);
                setSelectedId(null);
                setMode('select');
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [selectedId, level, undo, redo, handleTogglePlay, setRefreshCount, setSelectedId, setMode]);



    // Layout Fix: Added min-h-0 to flex container to ensure proper shrinking
    // const styles = { height: `${viewportHeight}px` };  <-- removed


    // ... (handleTogglePlay)


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



    // const handleAddWaypoint = (p: Point) => {
    //     setLevel(prev => ({ ...prev, waypoints: [...(prev.waypoints || []), p] }));
    //     setMode('select');
    //     audioService.playSE('click');
    // };



    return (
        <div
            className="fixed inset-0 flex flex-col bg-black overflow-hidden"
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
            </div>

            {/* Content Area */}
            <div className="flex-1 flex relative overflow-hidden min-h-0">
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
                        t={gameState.t}
                        a={gameState.a}
                        level={level}
                        player={gameState.status !== 'idle' ? { x: gameState.x, y: gameState.y } : undefined}
                        currentWaypointIndex={gameState.currentWaypointIndex}

                        viewOffset={viewOffset}
                        scale={scale}
                        onViewChange={(o, s) => { setViewOffset(o); setScale(s); }}

                        mode={mode}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onLevelChange={setLevel}

                        onShapeCreate={(s) => {
                            setLevel(prev => ({ ...prev, shapes: [...(prev.shapes || []), s] }));
                            // setMode('select'); // Removed to allow continuous input
                            audioService.playSE('click');
                        }}
                        onWaypointCreate={(p) => {
                            setLevel(prev => ({ ...prev, waypoints: [...(prev.waypoints || []), p] }));
                            // setMode('select'); // Removed to allow continuous input
                            audioService.playSE('click');
                        }}
                        onObjectClick={() => { /* ... */ }}

                        onRightClick={handleRightClick}
                        snapStep={snapStep}
                        refreshTrigger={refreshCount}
                        showForbiddenOverlay={level.showInequalities ?? true}

                        className="w-full h-full"
                        activeShapeIds={gameState.status === 'idle' ? undefined : activeShapeIds}
                    />

                    {/* Modals */}
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
