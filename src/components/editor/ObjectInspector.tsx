import React, { useMemo } from 'react';
import { Trash2 } from 'lucide-react';
import type { LevelConfig, CircleConstraint, RectConstraint } from '../../types/Level';
import { MathEngine } from '../../core/math/MathEngine';

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
    // Logic extracted from EditPage
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

    if (!selectedObject) {
        return <div className="text-gray-500 text-sm italic">Select object to edit</div>;
    }

    return (
        <div className="bg-white/5 p-4 rounded border border-white/10">
            <div className="flex justify-between items-center mb-2">
                <span className="text-neon-yellow font-bold">{selectedObject.label}</span>
                {!['START', 'GOAL'].includes(selectedObject.label) && (
                    <button onClick={handleDeleteSelected} className="text-red-500 hover:text-red-400" title="Delete"><Trash2 size={16} /></button>
                )}
            </div>
            {selectedObject.type === 'point' && (
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
    );
};
