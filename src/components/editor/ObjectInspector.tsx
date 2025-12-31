import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import { MathInput } from '../math/MathInput';
import type { LevelConfig, CircleConstraint, RectConstraint } from '../../types/Level';

interface ObjectInspectorProps {
    selectedId: string | null;
    level: LevelConfig;
    setLevel: React.Dispatch<React.SetStateAction<LevelConfig>>;
    handleDeleteSelected: () => void;
    snapStep: number;
}

export const ObjectInspector: React.FC<ObjectInspectorProps> = ({
    selectedId,
    level,
    setLevel,
    handleDeleteSelected,
    snapStep
}) => {

    const selectedObject = useMemo(() => {
        if (!selectedId) return null;
        const shape = level.shapes?.find(s => s.id === selectedId);
        if (shape) return { type: 'shape', label: shape.type === 'rect' ? 'RECT' : 'CIRCLE', val: shape };
        return null; // Ignore non-shape objects
    }, [selectedId, level]);

    if (!selectedObject) {
        return null; // Do not render anything if no shape selected
    }

    return (
        <div className="bg-white/5 p-4 rounded border border-white/10 mt-4">
            <div className="flex justify-between items-center mb-2">
                <span className="text-neon-yellow font-bold">{selectedObject.label}</span>
                <button onClick={handleDeleteSelected} className="text-red-500 hover:text-red-400" title="Delete"><Trash2 size={16} /></button>
            </div>
            {selectedObject.type === 'shape' && (
                <div className="flex flex-col gap-2">
                    {selectedObject.label === 'CIRCLE' ? (
                        /* CIRCLE Inspector */
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

                            <div className="mt-2 text-xs border-t border-white/10 pt-2">
                                <label className="text-neon-yellow mb-1 block font-bold">Active Conditions (OR groups)</label>

                                {/* Complex Conditions List */}
                                <div className="space-y-2">
                                    {((selectedObject.val as CircleConstraint).conditions || []).map((group, gIdx) => (
                                        <div key={gIdx} className="bg-black/30 p-2 rounded border border-white/10">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] text-gray-500">Group {gIdx + 1} (AND)</span>
                                                <button onClick={() => {
                                                    const newConds = [...((selectedObject.val as CircleConstraint).conditions || [])];
                                                    newConds.splice(gIdx, 1);
                                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                }} className="text-gray-500 hover:text-red-500"><Trash2 size={10} /></button>
                                            </div>
                                            <div className="space-y-1">
                                                {group.map((c, cIdx) => (
                                                    <div key={cIdx} className="flex gap-1 items-center">
                                                        <div className="flex-1"><MathInput value={c} onChange={v => {
                                                            const newConds = [...((selectedObject.val as CircleConstraint).conditions || [])];
                                                            newConds[gIdx] = [...newConds[gIdx]];
                                                            newConds[gIdx][cIdx] = v;
                                                            setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                        }} placeholder="e.g. t < 5" /></div>
                                                        <button onClick={() => {
                                                            const newConds = [...((selectedObject.val as CircleConstraint).conditions || [])];
                                                            newConds[gIdx] = newConds[gIdx].filter((_, i) => i !== cIdx);
                                                            if (newConds[gIdx].length === 0) newConds.splice(gIdx, 1);
                                                            setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                        }} className="text-gray-600 hover:text-red-500"><Trash2 size={10} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => {
                                                    const newConds = [...((selectedObject.val as CircleConstraint).conditions || [])];
                                                    newConds[gIdx] = [...newConds[gIdx], ''];
                                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                }} className="text-[10px] text-neon-blue hover:underline">+ AND Condition</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Fallback Legacy Condition Display */}
                                {!(selectedObject.val as CircleConstraint).conditions?.length && (selectedObject.val as CircleConstraint).condition && (
                                    <div className="mb-2 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded">
                                        <div className="text-[10px] text-yellow-500 mb-1">Legacy Condition:</div>
                                        <MathInput
                                            value={(selectedObject.val as CircleConstraint).condition || ''}
                                            onChange={v => {
                                                setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, condition: v } : s) }));
                                            }}
                                        />
                                        <button onClick={() => {
                                            const old = (selectedObject.val as CircleConstraint).condition;
                                            setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, condition: undefined, conditions: [[old || '']] } : s) }));
                                        }} className="text-[10px] text-neon-yellow underline mt-1">Convert to Complex Logic</button>
                                    </div>
                                )}

                                <button onClick={() => {
                                    const newConds = [...((selectedObject.val as CircleConstraint).conditions || [])];
                                    newConds.push(['']);
                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                }} className="w-full mt-2 py-1 border border-dashed border-white/20 hover:bg-white/5 text-[10px] text-gray-400 rounded">
                                    + Add Condition Group (OR)
                                </button>
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
                            <div className="mt-2 text-xs border-t border-white/10 pt-2">
                                <label className="text-neon-yellow mb-1 block font-bold">Active Conditions (OR groups)</label>

                                {/* Complex Conditions List */}
                                <div className="space-y-2">
                                    {((selectedObject.val as RectConstraint).conditions || []).map((group, gIdx) => (
                                        <div key={gIdx} className="bg-black/30 p-2 rounded border border-white/10">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[9px] text-gray-500">Group {gIdx + 1} (AND)</span>
                                                <button onClick={() => {
                                                    const newConds = [...((selectedObject.val as RectConstraint).conditions || [])];
                                                    newConds.splice(gIdx, 1);
                                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                }} className="text-gray-500 hover:text-red-500"><Trash2 size={10} /></button>
                                            </div>
                                            <div className="space-y-1">
                                                {group.map((c, cIdx) => (
                                                    <div key={cIdx} className="flex gap-1 items-center">
                                                        <div className="flex-1"><MathInput value={c} onChange={v => {
                                                            const newConds = [...((selectedObject.val as RectConstraint).conditions || [])];
                                                            newConds[gIdx] = [...newConds[gIdx]];
                                                            newConds[gIdx][cIdx] = v;
                                                            setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                        }} placeholder="e.g. t < 5" /></div>
                                                        <button onClick={() => {
                                                            const newConds = [...((selectedObject.val as RectConstraint).conditions || [])];
                                                            newConds[gIdx] = newConds[gIdx].filter((_, i) => i !== cIdx);
                                                            if (newConds[gIdx].length === 0) newConds.splice(gIdx, 1);
                                                            setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                        }} className="text-gray-600 hover:text-red-500"><Trash2 size={10} /></button>
                                                    </div>
                                                ))}
                                                <button onClick={() => {
                                                    const newConds = [...((selectedObject.val as RectConstraint).conditions || [])];
                                                    newConds[gIdx] = [...newConds[gIdx], ''];
                                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                                }} className="text-[10px] text-neon-blue hover:underline">+ AND Condition</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Fallback Legacy Condition Display */}
                                {!(selectedObject.val as RectConstraint).conditions?.length && (selectedObject.val as RectConstraint).condition && (
                                    <div className="mb-2 bg-yellow-500/10 border border-yellow-500/30 p-2 rounded">
                                        <div className="text-[10px] text-yellow-500 mb-1">Legacy Condition:</div>
                                        <MathInput
                                            value={(selectedObject.val as RectConstraint).condition || ''}
                                            onChange={v => {
                                                setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, condition: v } : s) }));
                                            }}
                                        />
                                        <button onClick={() => {
                                            const old = (selectedObject.val as RectConstraint).condition;
                                            setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, condition: undefined, conditions: [[old || '']] } : s) }));
                                        }} className="text-[10px] text-neon-yellow underline mt-1">Convert to Complex Logic</button>
                                    </div>
                                )}

                                <button onClick={() => {
                                    const newConds = [...((selectedObject.val as RectConstraint).conditions || [])];
                                    newConds.push(['']);
                                    setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, conditions: newConds } : s) }));
                                }} className="w-full mt-2 py-1 border border-dashed border-white/20 hover:bg-white/5 text-[10px] text-gray-400 rounded">
                                    + Add Condition Group (OR)
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
