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
                                <label className="text-neon-yellow mb-1 block">Active Condition</label>
                                <MathInput
                                    value={(selectedObject.val as CircleConstraint).condition || ''}
                                    onChange={v => {
                                        setLevel(l => ({ ...l, shapes: l.shapes.map(s => s.id === selectedId ? { ...s, condition: v } : s) }));
                                    }}
                                    placeholder="Always active (e.g. t < 5)"
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
                            <div className="mt-2 text-xs border-t border-white/10 pt-2">
                                <label className="text-neon-yellow mb-1 block">Active Condition</label>
                                <MathInput
                                    value={(selectedObject.val as RectConstraint).condition || ''}
                                    onChange={v => {
                                        setLevel(l => ({ ...l, shapes: l.shapes.map(sh => sh.id === selectedId ? { ...sh, condition: v } : sh) }));
                                    }}
                                    placeholder="Always active (e.g. t < 5)"
                                />
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};
