import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GameCanvas } from '../components/game/GameCanvas';
import type { InteractionMode } from '../components/game/GameCanvas';

import { DEFAULT_LEVEL } from '../types/Level';
import type { LevelConfig, Point, CircleConstraint, RectConstraint } from '../types/Level';
import { MathEngine } from '../core/math/MathEngine';
import { useGameLoop } from '../hooks/useGameLoop';
import { EditorSidebar } from '../components/editor/EditorSidebar';
import { Move } from 'lucide-react';

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
    const { state: level, setState: setLevel, undo, redo, canUndo, canRedo, reset } = useHistory<LevelConfig>(DEFAULT_LEVEL);

    const [testF, setTestF] = useState('0'); // Default 0
    const [snapStep, setSnapStep] = useState(0.5); // Default 0.5

    // View State
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(40);

    // Interaction State
    const [mode, setMode] = useState<InteractionMode>('select');
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const [showHelp, setShowHelp] = useState(false);

    const fFn = useMemo(() => MathEngine.compile(testF), [testF]);
    const gFn = useMemo(() => MathEngine.compile(level.g_raw), [level.g_raw]);

    const { gameState, startGame, stopGame } = useGameLoop(fFn, gFn, level);

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

    const handleTogglePlay = () => {
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
        <div className="h-full flex relative">
            {/* Sidebar */}
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
                DEFAULT_LEVEL={DEFAULT_LEVEL}
                resetView={resetView}
                testF={testF}
                setTestF={setTestF}
                snapStep={snapStep}
                setSnapStep={setSnapStep}
                gameState={gameState}
                handleTogglePlay={handleTogglePlay}
                onHelpClick={() => setShowHelp(true)}
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
                {showHelp && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50 p-8" onClick={() => setShowHelp(false)}>
                        <div className="bg-neon-surface border border-neon-blue rounded-xl p-6 max-w-2xl text-left overflow-y-auto max-h-[80vh]" onClick={e => e.stopPropagation()}>
                            <h3 className="text-2xl font-bold text-neon-blue mb-4">Manual</h3>

                            <div className="space-y-4 text-gray-300">
                                <section>
                                    <h4 className="font-bold text-white border-b border-gray-600 mb-2">Controls</h4>
                                    <ul className="list-disc pl-5 text-sm space-y-1">
                                        <li><b>Tools:</b> Use Undo/Redo/Reset at top left.</li>
                                        <li><b>Snapping:</b> Adjust 'Snap Step' in sidebar.</li>
                                        <li><b>Constraints:</b> Add realtime math constraints (e.g. <code>y &lt; 0</code>) or Shapes.</li>
                                        <li><b>Inspect:</b> Click an object to edit exact coordinates or ranges.</li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    </div>
                )}

                {/* Game Status */}
                {gameState.status !== 'idle' && gameState.status !== 'playing' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
                        <div className="p-8 border-2 rounded-xl text-center bg-black shadow-[0_0_50px_rgba(0,0,0,0.8)] border-neon-blue">
                            <h2 className={`text-6xl font-black mb-2 ${gameState.status === 'won' ? 'text-neon-green' : 'text-red-500'}`}>
                                {gameState.status === 'won' ? 'CLEAR!!' : 'FAILED'}
                            </h2>
                            <button onClick={stopGame} className="mt-4 px-6 py-2 bg-white text-black font-bold rounded hover:bg-gray-200">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
