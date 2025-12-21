import React, { useRef, useEffect, useState } from 'react';
import { MathEngine, type MathFunction } from '../../core/math/MathEngine';
import { audioService } from '../../services/AudioService';

import type { LevelConfig, Point, CircleConstraint, RectConstraint, DynamicPoint } from '../../types/Level';
import {
    drawGrid, drawFunction, drawShape, drawWaypoint, drawEntities,
    drawPlayer, drawHoverTooltip, drawConstraintsOverlay, drawCoordinateLabel,
    drawConstraintBoundaries, compileConstraints
} from './GameRenderer';

export type InteractionMode = 'select' | 'pan' | 'create_rect' | 'create_circle' | 'add_waypoint';

interface GameCanvasProps {
    f?: MathFunction;
    g?: MathFunction;
    t?: number;
    level: LevelConfig;
    player?: { x: number, y: number };

    viewOffset: { x: number, y: number };
    scale: number;
    onViewChange: (offset: { x: number, y: number }, scale: number) => void;

    mode: InteractionMode;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onLevelChange: (newLevel: LevelConfig) => void;

    onShapeCreate?: (shape: CircleConstraint | RectConstraint) => void;
    onWaypointCreate?: (p: Point) => void;

    onObjectClick?: (info: { type: 'start' | 'goal' | 'waypoint', index?: number, p: Point }) => void;

    currentWaypointIndex?: number;

    onRightClick?: () => void;

    snapStep: number;

    className?: string;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
    f, g, t = 0,
    level, player, currentWaypointIndex,
    viewOffset, scale, onViewChange,
    mode, selectedId, onSelect, onLevelChange,
    onShapeCreate, onWaypointCreate,
    onObjectClick,
    onRightClick,
    snapStep,
    className
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [rotation, setRotation] = useState({ w: 800, h: 600 });

    const [hoverPos, setHoverPos] = useState<Point | null>(null);
    const [dragState, setDragState] = useState<{
        type: 'view' | 'entity' | 'vertex' | 'create_shape';
        targetId?: string;
        vertexIndex?: number;
        startMouse: Point;
        startWorld?: Point | RectConstraint | CircleConstraint;
        initialTempShape?: any;
    } | null>(null);

    const [tempShape, setTempShape] = useState<any>(null);

    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                const { width, height } = entry.contentRect;
                setRotation({ w: Math.floor(width), h: Math.floor(height) });
            }
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    const ORIGIN_X = Math.floor(rotation.w / 2 + viewOffset.x);
    const ORIGIN_Y = Math.floor(rotation.h / 2 + viewOffset.y);

    const toWorldX = (sx: number) => (sx - ORIGIN_X) / scale;
    const toWorldY = (sy: number) => (ORIGIN_Y - sy) / scale;


    // Constraint Boundaries
    const constraintBoundaries = React.useMemo(() => {
        if (!level.constraints) return [];
        return level.constraints.map(group =>
            group.map(c => MathEngine.getBoundaries(c)).flat()
        ).flat();
    }, [level.constraints]);

    // Pre-compile constraints for caching - RESTORED
    const compiledConstraints = React.useMemo(() => {
        return compileConstraints(level.constraints || []);
    }, [level.constraints]);

    // --- Render Loop (Continuous) ---
    const latestProps = useRef({
        f, g, t, level, player, currentWaypointIndex,
        viewOffset, scale, selectedId, hoverPos, tempShape, rotation,
        compiledConstraints, constraintBoundaries
    });

    // Update ref when props change
    useEffect(() => {
        latestProps.current = {
            f, g, t, level, player, currentWaypointIndex,
            viewOffset, scale, selectedId, hoverPos, tempShape, rotation,
            compiledConstraints, constraintBoundaries
        };
    }, [f, g, t, level, player, currentWaypointIndex, viewOffset, scale, selectedId, hoverPos, tempShape, rotation, compiledConstraints, constraintBoundaries]);

    // Loop
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            const ctx = canvas.getContext('2d', { alpha: false });
            if (!ctx) {
                animationFrameId = requestAnimationFrame(render);
                return;
            }

            try {
                const {
                    f, g, t, level, player, currentWaypointIndex,
                    viewOffset, scale, selectedId, hoverPos, tempShape, rotation,
                    compiledConstraints, constraintBoundaries
                } = latestProps.current;

                const width = rotation.w;
                const height = rotation.h;

                if (width === 0 || height === 0) {
                    animationFrameId = requestAnimationFrame(render);
                    return;
                }

                // Recalculate helpers inside loop to ensure they match current state
                const ORIGIN_X = Math.floor(width / 2 + viewOffset.x);
                const ORIGIN_Y = Math.floor(height / 2 + viewOffset.y);

                const toScreenX = (x: number) => ORIGIN_X + x * scale;
                const toScreenY = (y: number) => ORIGIN_Y - y * scale;
                const toWorldX = (sx: number) => (sx - ORIGIN_X) / scale;
                const toWorldY = (sy: number) => (ORIGIN_Y - sy) / scale;


                // Clear Screen
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, width, height);

                // Draw Constraints Overlay (Optimized, Per-Frame)
                if (level.constraints && level.constraints.length > 0) {
                    const pX = player?.x ?? level.startPoint.x ?? 0;
                    const pY = player?.y ?? level.startPoint.y ?? 0;

                    // Overlay
                    drawConstraintsOverlay(ctx, width, height, toWorldX, toWorldY, compiledConstraints, t, pX, pY);

                    // Boundaries (Smart Lines)
                    drawConstraintBoundaries(
                        ctx,
                        constraintBoundaries,
                        width,
                        height,
                        toScreenX,
                        toScreenY,
                        toWorldX,
                        toWorldY,
                        t
                    );
                }

                drawGrid(ctx, width, height, scale, ORIGIN_X, ORIGIN_Y, toWorldX, toWorldY);

                if (level.shapes) {
                    level.shapes.forEach(s => drawShape(ctx, s, toScreenX, toScreenY, scale, selectedId === s.id));
                }
                if (tempShape) drawShape(ctx, tempShape, toScreenX, toScreenY, scale, true);

                if (f && f.isValid && g && g.isValid) {
                    const pX = player?.x ?? level.startPoint.x ?? 0;
                    const pY = player?.y ?? level.startPoint.y ?? 0;
                    drawFunction(ctx, f, g, width, toWorldX, toScreenY, t, pX, pY);
                }

                if (level.waypoints) level.waypoints.forEach((wp, i) => {
                    const pX = player?.x ?? level.startPoint.x ?? 0;
                    const pY = player?.y ?? level.startPoint.y ?? 0;
                    drawWaypoint(ctx, wp, i, toScreenX, toScreenY, selectedId === `wp_${i}`, i < (currentWaypointIndex ?? 0), t, pX, pY);
                });

                const pX = player?.x ?? level.startPoint.x ?? 0;
                const pY = player?.y ?? level.startPoint.y ?? 0;
                drawEntities(ctx, level, toScreenX, toScreenY, scale, selectedId, t, pX, pY);

                if (player) drawPlayer(ctx, player, toScreenX, toScreenY);

                if (hoverPos) {
                    drawHoverTooltip(ctx, hoverPos, toScreenX, toScreenY);
                }

                // Draw Coordinate Label if selected
                if (selectedId) {
                    let p: DynamicPoint | undefined;
                    if (selectedId === 'start') p = level.startPoint;
                    else if (selectedId === 'goal') p = level.goalPoint;
                    else if (selectedId.startsWith('wp_')) {
                        const idx = parseInt(selectedId.split('_')[1]);
                        if (level.waypoints && level.waypoints[idx]) p = level.waypoints[idx];
                    }

                    if (p) {
                        // Evaluate dynamic position
                        let px = p.x;
                        let py = p.y;
                        try {
                            const scope = { t, T: t, X: pX, Y: pY };
                            if (p.xFormula) px = MathEngine.evaluateScalar(p.xFormula, scope) || px;
                            if (p.yFormula) py = MathEngine.evaluateScalar(p.yFormula, scope) || py;
                        } catch { }

                        drawCoordinateLabel(ctx, { ...p, x: px, y: py }, toScreenX, toScreenY);
                    }
                }
            } catch (err: any) {
                console.error("Render Loop Error:", err);
            } finally {
                animationFrameId = requestAnimationFrame(render);
            }
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, []); // Run once, depend on refs


    // Snap Helper
    const snap = (v: number) => {
        // 0 step means no snap? User said default 0.5.
        const step = (snapStep > 0) ? snapStep : 0.0001;
        return Math.round(v / step) * step;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const zoomSensitivity = 0.001;
            const delta = -e.deltaY * zoomSensitivity;
            const newScale = Math.max(5, Math.min(300, scale + scale * delta));

            const rect = canvas.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;

            const wx = (mx - ORIGIN_X) / scale;
            const wy = (ORIGIN_Y - my) / scale;

            const newOriginX = mx - wx * newScale;
            const newOriginY = my + wy * newScale;

            const newOffsetX = newOriginX - rotation.w / 2;
            const newOffsetY = newOriginY - rotation.h / 2;

            onViewChange({ x: newOffsetX, y: newOffsetY }, newScale);
        };

        canvas.addEventListener('wheel', onWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', onWheel);
    }, [scale, viewOffset, rotation, onViewChange]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // Ignore non-left clicks (e.g. Right Click)

        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wx = toWorldX(mx);
        const wy = toWorldY(my);

        if (mode === 'create_rect') {
            const newId = `rect_${Date.now()}`;
            const initialShape: RectConstraint = { type: 'rect', id: newId, x: snap(wx), y: snap(wy), width: 0, height: 0 };
            setTempShape(initialShape);
            setDragState({ type: 'create_shape', startMouse: { x: mx, y: my }, startWorld: { x: snap(wx), y: snap(wy) }, initialTempShape: initialShape });
            return;
        }
        if (mode === 'create_circle') {
            const newId = `circ_${Date.now()}`;
            const initialShape: CircleConstraint = { type: 'circle', id: newId, center: { x: snap(wx), y: snap(wy) }, radius: 0 };
            setTempShape(initialShape);
            setDragState({ type: 'create_shape', startMouse: { x: mx, y: my }, startWorld: { x: snap(wx), y: snap(wy) }, initialTempShape: initialShape });
            return;
        }

        // Selection Handle Logic
        if (selectedId) {
            const shape = level.shapes?.find(s => s.id === selectedId);
            if (shape && shape.type === 'rect') {
                const p = [
                    { x: shape.x, y: shape.y + shape.height }, // TL (0)
                    { x: shape.x + shape.width, y: shape.y + shape.height }, // TR (1)
                    { x: shape.x + shape.width, y: shape.y }, // BR (2)
                    { x: shape.x, y: shape.y } // BL (3)
                ];

                for (let i = 0; i < 4; i++) {
                    if (distSq(wx, wy, p[i].x, p[i].y) < (15 / scale) ** 2) {
                        setDragState({
                            type: 'vertex', targetId: selectedId, vertexIndex: i,
                            startMouse: { x: mx, y: my }, startWorld: shape // Store shape copy
                        });
                        return;
                    }
                }
            }
            if (shape && shape.type === 'circle') {
                const dist = Math.sqrt(distSq(wx, wy, shape.center.x, shape.center.y));
                if (Math.abs(dist - shape.radius) < 10 / scale) {
                    setDragState({ type: 'vertex', targetId: selectedId, vertexIndex: -1, startMouse: { x: mx, y: my }, startWorld: shape });
                    return;
                }
            }
        }

        // Entities
        if (level.waypoints) {
            for (let i = 0; i < level.waypoints.length; i++) {
                if (distSq(wx, wy, level.waypoints[i].x, level.waypoints[i].y) < (15 / scale) ** 2) {
                    onSelect(`wp_${i}`);
                    audioService.playSE('click');
                    if (onObjectClick) onObjectClick({ type: 'waypoint', index: i, p: level.waypoints[i] });
                    setDragState({ type: 'entity', targetId: `wp_${i}`, startMouse: { x: mx, y: my }, startWorld: { x: level.waypoints[i].x, y: level.waypoints[i].y } });
                    return;
                }
            }
        }
        if (distSq(wx, wy, level.startPoint.x, level.startPoint.y) < (15 / scale) ** 2) {
            onSelect('start');
            audioService.playSE('click');
            if (onObjectClick) onObjectClick({ type: 'start', p: level.startPoint });
            setDragState({ type: 'entity', targetId: 'start', startMouse: { x: mx, y: my }, startWorld: level.startPoint });
            return;
        }
        if (distSq(wx, wy, level.goalPoint.x, level.goalPoint.y) < (15 / scale) ** 2) {
            onSelect('goal');
            audioService.playSE('click');
            if (onObjectClick) onObjectClick({ type: 'goal', p: level.goalPoint });
            setDragState({ type: 'entity', targetId: 'goal', startMouse: { x: mx, y: my }, startWorld: level.goalPoint });
            return;
        }

        // Shapes Body
        if (level.shapes) {
            for (let i = level.shapes.length - 1; i >= 0; i--) {
                const s = level.shapes[i];
                let hit = false;
                if (s.type === 'circle') hit = distSq(wx, wy, s.center.x, s.center.y) < s.radius ** 2;
                else {
                    hit = (wx >= s.x && wx <= s.x + s.width && wy >= s.y && wy <= s.y + s.height);
                }

                if (hit) {
                    onSelect(s.id);
                    audioService.playSE('click');
                    setDragState({ type: 'entity', targetId: s.id, startMouse: { x: mx, y: my }, startWorld: s });
                    return;
                }
            }
        }

        if (mode === 'add_waypoint') {
            if (onWaypointCreate) onWaypointCreate({ x: snap(wx), y: snap(wy) });
            return;
        }

        onSelect(null);
        setDragState({ type: 'view', startMouse: { x: mx, y: my }, startWorld: { x: wx, y: wy } as Point }); // Dummy Point
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = canvasRef.current!.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const wx = toWorldX(mx);
        const wy = toWorldY(my);

        setHoverPos({ x: wx, y: wy });

        if (!dragState) return;

        const dx = mx - dragState.startMouse.x;
        const dy = my - dragState.startMouse.y;

        if (dragState.type === 'view') {
            onViewChange({ x: viewOffset.x + dx, y: viewOffset.y + dy }, scale);
            setDragState(prev => prev ? { ...prev, startMouse: { x: mx, y: my } } : null);
        }
        else if (dragState.type === 'create_shape') {
            const swx = snap(wx);
            const swy = snap(wy);
            if (dragState.initialTempShape.type === 'rect') {
                // Create Rect
                const startX = (dragState.startWorld as Point).x;
                const startY = (dragState.startWorld as Point).y;

                const minX = Math.min(startX, swx);
                const maxX = Math.max(startX, swx);
                const minY = Math.min(startY, swy);
                const maxY = Math.max(startY, swy);

                setTempShape({ ...tempShape, x: minX, y: minY, width: maxX - minX, height: maxY - minY });
            } else if (tempShape.type === 'circle') {
                const center = tempShape.center;
                const radius = Math.sqrt((swx - center.x) ** 2 + (swy - center.y) ** 2);
                setTempShape({ ...tempShape, radius: snap(radius) }); // Apply snap to radius too if intuitive
            }
        }
        else if (dragState.type === 'entity' && dragState.targetId) {
            const wdx = dx / scale;
            const wdy = -dy / scale;

            if (dragState.targetId === 'start') {
                const startP = dragState.startWorld as Point;
                const curX = startP.x + wdx;
                const curY = startP.y + wdy;
                onLevelChange({ ...level, startPoint: { x: snap(curX), y: snap(curY) } });
            } else if (dragState.targetId === 'goal') {
                const startP = dragState.startWorld as Point;
                const curX = startP.x + wdx;
                const curY = startP.y + wdy;
                onLevelChange({ ...level, goalPoint: { x: snap(curX), y: snap(curY) } });
            } else if (dragState.targetId.startsWith('wp_')) {
                const idx = parseInt(dragState.targetId.split('_')[1]);
                const startP = dragState.startWorld as Point;
                const curX = startP.x + wdx;
                const curY = startP.y + wdy;
                const newWps = [...level.waypoints];
                newWps[idx] = { x: snap(curX), y: snap(curY) };
                onLevelChange({ ...level, waypoints: newWps });
            } else {
                // Shapes
                const s = dragState.startWorld as any;
                if (s) {
                    const newShapes = level.shapes.map(sh => {
                        if (sh.id !== s.id) return sh;
                        if (sh.type === 'circle') {
                            return { ...sh, center: { x: snap(s.center.x + wdx), y: snap(s.center.y + wdy) } };
                        } else if (sh.type === 'rect') {
                            return { ...sh, x: snap(s.x + wdx), y: snap(s.y + wdy) };
                        }
                        return sh;
                    });
                    onLevelChange({ ...level, shapes: newShapes });
                }
            }
        }
        else if (dragState.type === 'vertex' && dragState.targetId) {
            const s = dragState.startWorld as RectConstraint | CircleConstraint;
            if (s?.type === 'rect') {
                const swx = snap(wx);
                const swy = snap(wy);

                const oldMinX = s.x;
                const oldMaxX = s.x + s.width;
                const oldMinY = s.y;
                const oldMaxY = s.y + s.height;

                let newMinX = oldMinX, newMaxX = oldMaxX, newMinY = oldMinY, newMaxY = oldMaxY;

                if (dragState.vertexIndex === 0) { // TL
                    newMinX = Math.min(swx, oldMaxX);
                    newMaxY = Math.max(swy, oldMinY);
                }
                if (dragState.vertexIndex === 1) { // TR
                    newMaxX = Math.max(swx, oldMinX);
                    newMaxY = Math.max(swy, oldMinY);
                }
                if (dragState.vertexIndex === 2) { // BR
                    newMaxX = Math.max(swx, oldMinX);
                    newMinY = Math.min(swy, oldMaxY);
                }
                if (dragState.vertexIndex === 3) { // BL
                    newMinX = Math.min(swx, oldMaxX);
                    newMinY = Math.min(swy, oldMaxY);
                }

                const newShapes = level.shapes.map(sh => {
                    if (sh.id !== s.id) return sh;
                    return {
                        ...sh,
                        x: newMinX,
                        y: newMinY,
                        width: newMaxX - newMinX,
                        height: newMaxY - newMinY
                    } as RectConstraint;
                });
                onLevelChange({ ...level, shapes: newShapes });
            }
            if (s?.type === 'circle' && dragState.vertexIndex === -1) {
                const radius = Math.sqrt((wx - s.center.x) ** 2 + (wy - s.center.y) ** 2);
                const newShapes = level.shapes.map(sh => sh.id === s.id ? { ...sh, radius } : sh); // Radius not snapped usually? OR snap radius? User said "snap".
                onLevelChange({ ...level, shapes: newShapes });
            }
        }
    };

    const handleMouseUp = () => {
        if (dragState?.type === 'create_shape' && tempShape) {
            if (onShapeCreate) onShapeCreate(tempShape);
            setTempShape(null);
        }
        setDragState(null);
    };

    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onRightClick) onRightClick();
    };

    return (
        <div ref={containerRef} className={`w-full h-full relative ${className}`}>
            <canvas
                ref={canvasRef}
                width={rotation.w}
                height={rotation.h}
                className="block cursor-crosshair touch-none select-none"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onContextMenu={handleContextMenu}
            />
        </div>
    );
};

// --- Helpers ---

function distSq(x1: number, y1: number, x2: number, y2: number) {
    return (x1 - x2) ** 2 + (y1 - y2) ** 2;
}
