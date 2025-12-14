import React, { useState } from 'react';
import { Play, Square, Settings, HelpCircle, Target, Circle, Trash2, Plus, Ban, RotateCcw, RotateCw, RefreshCw, AlertTriangle } from 'lucide-react';
import type { InteractionMode } from '../game/GameCanvas';
import type { LevelConfig } from '../../types/Level';
import { MathInput } from '../math/MathInput';
import { ObjectInspector } from './ObjectInspector';
import { SettingsPanel } from './SettingsPanel';
import { MathEngine } from '../../core/math/MathEngine';




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

    onHelpClick: () => void;
}

export const EditorSidebar: React.FC<EditorSidebarProps> = ({
    level, setLevel, mode, setMode, selectedId, setSelectedId,
    undo, redo, canUndo, canRedo, reset, DEFAULT_LEVEL, resetView,
    testF, setTestF,
    snapStep, setSnapStep,
    gameState, handleTogglePlay,
    onHelpClick
}) => {
    const [showSettings, setShowSettings] = useState(false);

    // Compile g to check validity
    const gFunc = MathEngine.compile(level.g_raw || '');
    const onGChange = (val: string) => setLevel(prev => ({ ...prev, g_raw: val }));

    const handleResetLevel = () => {
        if (confirm("Reset layout to default? History will be cleared.")) {
            reset(DEFAULT_LEVEL);
            setTestF('0');
            resetView();
        }
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
        // Add a new group with one empty condition
        setLevel(prev => ({ ...prev, constraints: [...prev.constraints, ['']] }));
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

    // Bypass TS intrinsic elements check
    const MathField = 'math-field' as any;

    return (

        <div className="w-96 bg-neon-surface/90 border-r border-neon-blue/30 flex flex-col backdrop-blur-md z-10 transition-all duration-300">

            {/* Scrollable Main Content - Disabled when playing */}
            <div className={`flex-1 overflow-y-auto p-4 flex flex-col gap-6 ${gameState.isPlaying ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                {/* Header & Tools */}
                <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-neon-pink">EDITOR</h2>
                    <div className="flex gap-1">
                        <button onClick={() => undo()} disabled={!canUndo} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30" title="Undo"><RotateCcw size={16} /></button>
                        <button onClick={() => redo()} disabled={!canRedo} className="p-2 bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30" title="Redo"><RotateCw size={16} /></button>
                        <div className="w-2"></div>
                        <button onClick={handleResetLevel} className="p-2 bg-gray-800 rounded hover:bg-red-900 text-red-400" title="Reset Level"><RefreshCw size={16} /></button>
                        <button onClick={() => setShowSettings(!showSettings)} className="p-2 bg-gray-800 rounded hover:bg-gray-700" title="Settings"><Settings size={16} /></button>
                        <button onClick={onHelpClick} className="p-2 bg-gray-800 rounded hover:bg-gray-700" title="Help"><HelpCircle size={16} /></button>
                    </div>
                </div>

                {/* Current Action Indicator */}
                {mode !== 'select' && (
                    <div className="bg-neon-blue/10 border border-neon-blue/30 rounded p-2 text-center animate-in fade-in slide-in-from-top-2">
                        <span className="text-xs font-bold text-neon-blue animate-pulse block mb-2">
                            {mode === 'add_waypoint' ? 'Click on canvas to place Waypoint' : 'Drag on canvas to create shape'}
                        </span>
                        <button onClick={() => setMode('select')} className="w-full text-xs py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded text-gray-200 transition-colors">
                            Cancel Action
                        </button>
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
                    <MathField
                        readOnly={gameState.isPlaying}
                        onInput={(e: any) => onGChange(e.target.value)}
                        className={`w-full bg-black/50 text-white p-2 rounded border ${!gFunc.isValid ? 'border-red-500' : 'border-white/20'}`}
                    >
                        {gFunc.raw}
                    </MathField>
                    {!gFunc.isValid && (
                        <div className="text-red-500 text-[10px] mt-1 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            {gFunc.error || "Invalid Expression"}
                        </div>
                    )}

                    {/* Debug Info */}
                    <div className="mt-2 text-[10px] font-mono text-gray-500 border-t border-white/10 pt-1">
                        <details>
                            <summary className="cursor-pointer hover:text-white mb-1">Debug Info</summary>
                            <div className="pl-2 border-l border-gray-700">
                                <div>MathJS: <span className="text-green-400">{gFunc.mathJs || 'N/A'}</span></div>
                                <div>Native: {gFunc.native ? 'Yes' : 'No'}</div>
                                {gFunc.error && <div className="text-red-400 break-words">{gFunc.error}</div>}
                            </div>
                        </details>
                    </div>

                </div>

                <div className="mt-4">
                    <label className="text-gray-400 text-sm mb-1 block">Test f(x) (Player)</label>
                    <MathInput value={testF} onChange={setTestF} />
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



                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>Forbidden Areas (Inequalities)</span>
                        </div>
                        <button onClick={addConstraintGroup} className="w-full py-2 border border-dashed border-neon-blue/50 text-neon-blue hover:bg-neon-blue/10 hover:border-solid rounded flex items-center justify-center gap-2 text-xs transition-all">
                            <Plus size={14} /> Add Forbidden Area
                        </button>

                        {level.constraints.map((group, groupIndex) => (
                            <div key={groupIndex} className="bg-white/5 rounded p-2 border border-white/10">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider">Area {groupIndex + 1} (match ALL)</span>
                                    <button onClick={() => removeConstraintGroup(groupIndex)} className="text-red-500 hover:text-red-400 text-xs"><Trash2 size={12} /></button>
                                </div>
                                <div className="space-y-2 pl-2 border-l border-white/10 ml-1">
                                    {group.map((condition, condIndex) => (
                                        <div key={condIndex} className="flex gap-2 items-center">
                                            <div className="flex-1">
                                                <MathInput value={condition} onChange={v => updateConstraint(groupIndex, condIndex, v)} />
                                            </div>
                                            <button onClick={() => removeConstraintCondition(groupIndex, condIndex)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                        </div>
                                    ))}
                                    <button onClick={() => addConstraintCondition(groupIndex)} className="text-xs text-gray-500 hover:text-neon-blue flex items-center gap-1">
                                        <Plus size={10} /> AND Condition
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                </div>

                {/* Objects Section */}
                <div className="border-t border-white/10 pt-4">
                    <h3 className="text-neon-blue font-bold mb-3 flex items-center gap-2"><Target size={18} /> Objects</h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setMode('add_waypoint')} className={`p-2 rounded border flex items-center gap-2 justify-center text-xs ${mode === 'add_waypoint' ? 'bg-neon-blue text-black' : 'hover:bg-white/10 border-white/20'}`}>
                            <Target size={14} /> Add Waypoint
                        </button>
                    </div>
                </div>
            </div>

            {/* Play Button - Always Interactive */}
            <div className="p-4 shadow-lg bg-black border-t border-white/10 shrink-0 z-20">
                <button
                    onClick={handleTogglePlay}
                    className={`w-full py-3 font-bold rounded shadow-[0_0_10px_rgba(255,0,255,0.4)] flex items-center justify-center gap-2 transition-all ${gameState.isPlaying ? 'bg-red-500 text-white animate-pulse' : 'bg-neon-pink text-black hover:bg-neon-pink/80'}`}
                >
                    {gameState.isPlaying ? <><Square size={20} fill="white" /> STOP</> : <><Play size={20} fill="black" /> DEMOPLAY</>}
                </button>
            </div>
        </div >
    );
};
