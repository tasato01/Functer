import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { GameCanvas } from '../components/game/GameCanvas';
import type { InteractionMode } from '../components/game/GameCanvas';
import { MathInput } from '../components/math/MathInput';
import { DEFAULT_LEVEL } from '../types/Level';
import type { LevelConfig, Point, CircleConstraint, RectConstraint } from '../types/Level';
import { MathEngine } from '../core/math/MathEngine';
import { useGameLoop } from '../hooks/useGameLoop';
import { Play, Square, Settings, Move, HelpCircle, Target, Circle, Trash2, Plus, Ban, RotateCcw, RotateCw, RefreshCw } from 'lucide-react';

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
    const [showSettings, setShowSettings] = useState(false);

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
                const fx = fFn.compiled({ x: sx, t: 0, T: 0 });
                gy = gFn.compiled({ f: fx, x: sx, X: sx, t: 0, T: 0 });
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

    const handleResetLevel = () => {
        if (confirm("Reset layout to default? History will be cleared.")) {
            reset(DEFAULT_LEVEL);
            setTestF('0');
            resetView();
        }
    };

    const handleAddShape = (shape: CircleConstraint | RectConstraint) => {
        setLevel(prev => ({ ...prev, shapes: [...(prev.shapes || []), shape] }));
        setMode('select');
        setSelectedId(shape.id);
    };

    const handleAddWaypoint = (p: Point) => {
        setLevel(prev => ({ ...prev, waypoints: [...prev.waypoints, p] }));
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

    const handleEntityUpdate = (field: 'x' | 'y', valStr: string) => {
        if (!selectedId) return;

        let val = NaN;
        try {
            const f = MathEngine.compile(valStr);
            if (f.isValid) {
                val = f.compiled({ x: 0, y: 0, t: 0, T: 0 });
            }
        } catch { val = NaN; }

        if (isNaN(val) || !isFinite(val)) return;

        setLevel(prev => {
            if (selectedId === 'start') return { ...prev, startPoint: { ...prev.startPoint, [field]: val } };
            if (selectedId === 'goal') return { ...prev, goalPoint: { ...prev.goalPoint, [field]: val } };
            if (selectedId.startsWith('wp_')) {
                const idx = parseInt(selectedId.split('_')[1]);
                const newWps = [...prev.waypoints];
                if (newWps[idx]) newWps[idx] = { ...newWps[idx], [field]: val };
                return { ...prev, waypoints: newWps };
            }
            const newShapes = (prev.shapes || []).map(s => {
                if (s.id !== selectedId) return s;
                if (s.type === 'circle') return { ...s, center: { ...s.center, [field]: val } };
                if (s.type === 'rect') return { ...s, [field]: val };
                return s;
            });
            return { ...prev, shapes: newShapes };
        });
    };

    // Real-time Constraint Editing
    const updateConstraint = (index: number, val: string) => {
        setLevel(prev => {
            const newC = [...prev.constraints];
            newC[index] = val;
            return { ...prev, constraints: newC };
        });
    };

    const addConstraintRow = () => {
        setLevel(prev => ({ ...prev, constraints: [...prev.constraints, ''] }));
    };

    const removeConstraintRow = (index: number) => {
        setLevel(prev => ({
            ...prev,
            constraints: prev.constraints.filter((_, i) => i !== index)
        }));
    };

    // Get Selected Object Data for UI
    const selectedObject = useMemo(() => {
        if (!selectedId) return null;
        if (selectedId === 'start') return { type: 'point', label: 'START', val: level.startPoint, radius: level.startRadius };
        if (selectedId === 'goal') return { type: 'point', label: 'GOAL', val: level.goalPoint, radius: level.goalRadius };
        if (selectedId.startsWith('wp_')) {
            const idx = parseInt(selectedId.split('_')[1]);
            if (!level.waypoints[idx]) return null;
            return { type: 'point', label: `WP #${idx + 1}`, val: level.waypoints[idx] };
        }
        const shape = level.shapes?.find(s => s.id === selectedId);
        if (shape) return { type: 'shape', label: shape.type === 'rect' ? 'RECT' : 'CIRCLE', val: shape };
        return null;
    }, [selectedId, level]);

    return (
        <div className="h-full flex relative">
            {/* Sidebar */}
            <div className={`w-96 bg-neon-surface/90 border-r border-neon-blue/30 p-4 flex flex-col gap-6 overflow-y-auto backdrop-blur-md z-10 transition-all duration-300 ${gameState.isPlaying ? 'opacity-50 pointer-events-none grayscale' : ''}`}>

                {/* Header & Tools */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-neon-pink">EDITOR</h2>
                    <div className="flex gap-1">
                        <button onClick={() => undo()} disabled={!canUndo} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30" title="Undo"><RotateCcw size={16} /></button>
                        <button onClick={() => redo()} disabled={!canRedo} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30" title="Redo"><RotateCw size={16} /></button>
                        <div className="w-2"></div>
                        <button onClick={handleResetLevel} className="p-2 bg-gray-800 rounded hover:bg-red-900 text-red-400" title="Reset Level"><RefreshCw size={16} /></button>
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-gray-800 rounded hover:bg-gray-700" title="Settings"><Settings size={16} /></button>
                        <button onClick={() => setShowHelp(true)} className="p-2 bg-gray-800 rounded hover:bg-gray-700" title="Help"><HelpCircle size={16} /></button>
                    </div>
                </div>

                {/* Settings Modal (Inline or Popover) */}
                {showSettings && (
                    <div className="bg-black/80 border border-neon-blue rounded p-4 mb-4 animate-in fade-in slide-in-from-top-2">
                        <h3 className="font-bold text-neon-blue mb-2 flex items-center gap-2"><Settings size={14} /> Settings</h3>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Snap Step</span>
                                <input type="number" step="0.1" className="w-20 bg-black/50 border border-white/20 rounded px-2 py-1 text-right"
                                    value={snapStep} onChange={e => setSnapStep(Number(e.target.value))} />
                            </div>
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-300">Player Speed</span>
                                <input type="number" step="0.1" className="w-20 bg-black/50 border border-white/20 rounded px-2 py-1 text-right"
                                    value={level.playerSpeed ?? 1.0} onChange={e => setLevel(l => ({ ...l, playerSpeed: Number(e.target.value) }))} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Selected Object Inspector */}
                {selectedObject ? (
                    <div className="bg-white/5 p-4 rounded border border-white/10">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-neon-yellow font-bold">{selectedObject.label}</span>
                            {!['START', 'GOAL'].includes(selectedObject.label) && (
                                <button onClick={handleDeleteSelected} className="text-red-500 hover:text-red-400" title="Delete"><Trash2 size={16} /></button>
                            )}
                        </div>
                        {selectedObject.type === 'point' && (
                            // ... (point inspector mostly same, verify closing tags)
                            <div className="flex flex-col gap-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <div className="flex items-center gap-1">
                                        <label className="text-gray-400 w-4">X</label>
                                        <input
                                            key={`${selectedObject.label}-x-${(selectedObject.val as any).x ?? (selectedObject.val as any).center?.x}`}
                                            type="text"
                                            className="w-full bg-black/50 border border-white/20 rounded px-1"
                                            defaultValue={(selectedObject.val as any).x ?? (selectedObject.val as any).center?.x}
                                            onBlur={e => handleEntityUpdate('x', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleEntityUpdate('x', e.currentTarget.value) }}
                                        />
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <label className="text-gray-400 w-4">Y</label>
                                        <input
                                            key={`${selectedObject.label}-y-${(selectedObject.val as any).y ?? (selectedObject.val as any).center?.y}`}
                                            type="text"
                                            className="w-full bg-black/50 border border-white/20 rounded px-1"
                                            defaultValue={(selectedObject.val as any).y ?? (selectedObject.val as any).center?.y}
                                            onBlur={e => handleEntityUpdate('y', e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') handleEntityUpdate('y', e.currentTarget.value) }}
                                        />
                                    </div>
                                </div>
                                {(selectedId === 'start' || selectedId === 'goal') && (
                                    <div className="flex gap-2 items-center">
                                        <label className="text-sm text-gray-400">Radius</label>
                                        <input type="number" step="0.1" className="flex-1 bg-black/50 border border-white/20 rounded px-1"
                                            value={selectedId === 'start' ? level.startRadius : level.goalRadius}
                                            onChange={e => {
                                                const val = Math.max(0, Number(e.target.value));
                                                if (selectedId === 'start') setLevel(l => ({ ...l, startRadius: val }));
                                                else setLevel(l => ({ ...l, goalRadius: val }));
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                        {/* Shape Inspector ... */}
                        {selectedObject.type === 'shape' && (
                            <div className="flex flex-col gap-2">
                                {selectedObject.label === 'CIRCLE' ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex items-center gap-1"><label className="text-gray-400 text-xs">cX</label>
                                                <input type="number" step={snapStep} className="w-full bg-black/50 border border-white/20 rounded px-1"
                                                    value={(selectedObject.val as CircleConstraint).center.x}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, center: { ...(s as CircleConstraint).center, x: v } } : s) }));
                                                    }}
                                                />
                                            </div>
                                            <div className="flex items-center gap-1"><label className="text-gray-400 text-xs">cY</label>
                                                <input type="number" step={snapStep} className="w-full bg-black/50 border border-white/20 rounded px-1"
                                                    value={(selectedObject.val as CircleConstraint).center.y}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, center: { ...(s as CircleConstraint).center, y: v } } : s) }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1"><label className="text-gray-400 text-xs">R</label>
                                            <input type="number" step={0.1} className="w-full bg-black/50 border border-white/20 rounded px-1"
                                                value={(selectedObject.val as CircleConstraint).radius}
                                                onChange={e => {
                                                    const v = Math.max(0, Number(e.target.value));
                                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, radius: v } : s) }));
                                                }}
                                            />
                                        </div>
                                    </>
                                ) : (
                                    /* RECT Inspector */
                                    <>
                                        <div className="grid grid-cols-1 gap-2">
                                            <div className="text-xs text-gray-400">X Range (Min ~ Max)</div>
                                            <div className="flex gap-1">
                                                <input type="number" step={snapStep} className="w-full bg-black/50 border border-white/20 rounded px-1" placeholder="Min"
                                                    value={(selectedObject.val as RectConstraint).x}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        const s = selectedObject.val as RectConstraint;
                                                        const currentMax = s.x + s.width;
                                                        const newWidth = currentMax - v;
                                                        setLevel(l => ({ ...l, shapes: l.shapes.map(sh => sh.id === selectedId ? { ...sh, x: v, width: newWidth } : sh) }));
                                                    }}
                                                />
                                                <span className="text-gray-500">~</span>
                                                <input type="number" step={snapStep} className="w-full bg-black/50 border border-white/20 rounded px-1" placeholder="Max"
                                                    value={(selectedObject.val as RectConstraint).x + (selectedObject.val as RectConstraint).width}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        const s = selectedObject.val as RectConstraint;
                                                        const newWidth = v - s.x;
                                                        setLevel(l => ({ ...l, shapes: l.shapes.map(sh => sh.id === selectedId ? { ...sh, width: newWidth } : sh) }));
                                                    }}
                                                />
                                            </div>

                                            <div className="text-xs text-gray-400">Y Range (Min ~ Max)</div>
                                            <div className="flex gap-1">
                                                <input type="number" step={snapStep} className="w-full bg-black/50 border border-white/20 rounded px-1" placeholder="Min"
                                                    value={(selectedObject.val as RectConstraint).y}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        const s = selectedObject.val as RectConstraint;
                                                        const currentMax = s.y + s.height;
                                                        const newHeight = currentMax - v;
                                                        setLevel(l => ({ ...l, shapes: l.shapes.map(sh => sh.id === selectedId ? { ...sh, y: v, height: newHeight } : sh) }));
                                                    }}
                                                />
                                                <span className="text-gray-500">~</span>
                                                <input type="number" step={snapStep} className="w-full bg-black/50 border border-white/20 rounded px-1" placeholder="Max"
                                                    value={(selectedObject.val as RectConstraint).y + (selectedObject.val as RectConstraint).height}
                                                    onChange={e => {
                                                        const v = Number(e.target.value);
                                                        const s = selectedObject.val as RectConstraint;
                                                        const newHeight = v - s.y;
                                                        setLevel(l => ({ ...l, shapes: l.shapes.map(sh => sh.id === selectedId ? { ...sh, height: newHeight } : sh) }));
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-gray-500 text-sm italic">Select object to edit</div>
                )}

                {/* Function Section */}
                <div>
                    {/* ... Same ... */}
                    <h3 className="text-neon-pink font-bold mb-3 flex items-center gap-2"><Settings size={18} /> Functions</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">g(f)(x) (Stage)</label>
                            <MathInput value={level.g_raw} onChange={v => setLevel(l => ({ ...l, g_raw: v }))} />
                        </div>
                        <div>
                            <label className="text-gray-400 text-sm mb-1 block">Test f(x) (Player)</label>
                            <MathInput value={testF} onChange={setTestF} />
                        </div>
                    </div>
                </div>

                {/* Forbidden Areas */}
                <div className="border-t border-white/10 pt-4">
                    <h3 className="text-red-500 font-bold mb-3 flex items-center gap-2"><Ban size={18} /> Forbidden Areas</h3>

                    <div className="grid grid-cols-2 gap-2 mb-4">
                        <button onClick={() => setMode('create_rect')} className={`p-2 rounded border flex items-center gap-2 justify-center text-xs ${mode === 'create_rect' ? 'bg-neon-blue text-black' : 'hover:bg-white/10 border-white/20'}`}>
                            <Square size={14} /> Rect
                        </button>
                        <button onClick={() => setMode('create_circle')} className={`p-2 rounded border flex items-center gap-2 justify-center text-xs ${mode === 'create_circle' ? 'bg-neon-blue text-black' : 'hover:bg-white/10 border-white/20'}`}>
                            <Circle size={14} /> Circle
                        </button>
                    </div>
                    {mode !== 'select' && (
                        <div className="text-center mb-2">
                            <span className="text-xs text-neon-blue animate-pulse">
                                {mode === 'add_waypoint' ? 'Click on canvas to add Waypoint' : 'Drag on canvas to create...'}
                            </span>
                            <button onClick={() => setMode('select')} className="block w-full mt-1 text-xs py-1 bg-gray-700 rounded text-gray-300">Cancel</button>
                        </div>
                    )}

                    <div className="space-y-2">
                        {/* ... Same ... */}
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Inequality Constraints (Real-time)</span>
                            <button onClick={addConstraintRow} className="text-neon-blue hover:text-white flex items-center gap-1"><Plus size={12} /> Add</button>
                        </div>
                        {level.constraints.map((c, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <MathInput value={c} onChange={v => updateConstraint(i, v)} />
                                </div>
                                <button onClick={() => removeConstraintRow(i)} className="text-red-400 hover:text-red-300"><Trash2 size={16} /></button>
                            </div>
                        ))}
                        {level.constraints.length === 0 && (
                            <button onClick={addConstraintRow} className="w-full text-center text-sm py-2 border border-dashed border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300 rounded">
                                + Add Formula Constraint
                            </button>
                        )}
                    </div>
                </div>

                {/* Objects Section (Moved here) */}
                <div className="border-t border-white/10 pt-4">
                    <h3 className="text-neon-blue font-bold mb-3 flex items-center gap-2"><Target size={18} /> Objects</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMode('add_waypoint')} className={`p-2 rounded border flex items-center gap-2 justify-center text-xs ${mode === 'add_waypoint' ? 'bg-neon-blue text-black' : 'hover:bg-white/10 border-white/20'}`}>
                            <Target size={14} /> Add Waypoint
                        </button>
                    </div>
                </div>

                {/* Play Button */}
                <div className="mt-auto pt-4 shadow-lg bg-black sticky bottom-0">
                    <button
                        onClick={handleTogglePlay}
                        className={`w-full py-3 font-bold rounded shadow-[0_0_10px_rgba(255,0,255,0.4)] flex items-center justify-center gap-2 transition-all ${gameState.isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-neon-pink text-black hover:bg-neon-pink/80'}`}
                    >
                        {gameState.isPlaying ? <><Square size={20} fill="white" /> STOP</> : <><Play size={20} fill="black" /> DEMOPLAY</>}
                    </button>
                </div>
            </div>

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
