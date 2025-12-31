import React, { useRef, useEffect, useState } from 'react';
import { MathEngine, type MathFunction } from '../../core/math/MathEngine';
import { audioService } from '../../services/AudioService';

import type { LevelConfig, Point, CircleConstraint, RectConstraint, DynamicPoint } from '../../types/Level';
import {
    drawGrid, drawFunction, drawShape, drawWaypoint, drawEntities,
    drawPlayer, drawHoverTooltip, drawConstraintsOverlay, drawCoordinateLabel,
    compileConstraints
} from './GameRenderer';

export type InteractionMode = 'select' | 'pan' | 'create_rect' | 'create_circle' | 'add_waypoint';

interface GameCanvasProps {
    f?: MathFunction;
    g?: MathFunction;
    t?: number;
    a?: number; // Player variable
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
    isStatic?: boolean;
    showForbiddenOverlay?: boolean;
    refreshTrigger?: number; // Added for manual refresh
    activeShapeIds?: Set<string>;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
    f, g, t = 0, a = 0,
    level, player, currentWaypointIndex,
    viewOffset, scale, onViewChange,
    mode, selectedId, onSelect, onLevelChange,
    onShapeCreate, onWaypointCreate,
    onObjectClick,
    onRightClick,
    snapStep,
    className,
    isStatic = false,
    showForbiddenOverlay = true,
    refreshTrigger,
    activeShapeIds
}) => {
    // Identity transformation for drawing raw f(x)
    const IDENTITY_G: MathFunction = {
        raw: 'f',
        compiled: (params: any) => params.f,
        isValid: true
    };

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [rotation, setRotation] = useState({ w: 800, h: 600 });

    // Refresh Logic
    useEffect(() => {
        if (!containerRef.current) return;
        const measure = () => {
            const rect = containerRef.current?.getBoundingClientRect();
            if (rect) {
                setRotation({ w: Math.floor(rect.width), h: Math.floor(rect.height) });
            }
        };
        measure();
        // If refreshTrigger changes, re-measure
    }, [refreshTrigger, containerRef]);

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




    // Pre-compile constraints for caching - RESTORED
    const compiledConstraints = React.useMemo(() => {
        return compileConstraints(level.constraints || []);
    }, [level.constraints]);

    // --- Render Loop (Continuous) ---
    const latestProps = useRef({
        f, g, t, a, level, player, currentWaypointIndex,
        viewOffset, scale, selectedId, hoverPos, tempShape, rotation,
        compiledConstraints, isStatic, showForbiddenOverlay, activeShapeIds
    });

    // Update ref when props change
    useEffect(() => {
        latestProps.current = {
            f, g, t, a, level, player, currentWaypointIndex,
            viewOffset, scale, selectedId, hoverPos, tempShape, rotation,
            compiledConstraints, isStatic, showForbiddenOverlay, activeShapeIds
        };
    }, [f, g, t, a, level, player, currentWaypointIndex, viewOffset, scale, selectedId, hoverPos, tempShape, rotation, compiledConstraints, isStatic, showForbiddenOverlay, activeShapeIds]);

    // Loop
    useEffect(() => {
        let animationFrameId: number;

        const render = () => {
            const canvas = canvasRef.current;
            if (!canvas) {
                // If canvas is not ready yet, keep retrying even if static.
                // But if static and canvas is gone, we stop?
                // Better: standard loop
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
                    f, g, t, a, level, player, currentWaypointIndex,
                    viewOffset, scale, selectedId, hoverPos, tempShape, rotation,
                    compiledConstraints, isStatic, showForbiddenOverlay, activeShapeIds
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

                // Draw Inequality Constraints (OR of ANDs)
                // Filter out conditional shapes that might be part of constraints? 
                // Currently constraints are separate from shapes logic in useGameLoop, BUT 
                // in GameRenderer, drawConstraintsOverlay implementation relies on compiledConstraints passed as prop. 
                // Those are from level.constraints string[]?
                // Wait, useGameLoop separates 'shapes' and 'constraints'.
                // 'constraints' implies the complex inequality string array.
                // 'shapes' implies the Circle/Rect objects.
                // The implementation for visual cue requested is for 'Forbidden Areas' which usually means 'Shapes' in this context since we added 'condition' to Circle/Rect.
                // So I only need to touch the shapes drawing loop below.

                const showInequalities = (level.showInequalities !== false) && (showForbiddenOverlay !== false);
                if (showInequalities && level.constraints && level.constraints.length > 0) {
                    const pX = player?.x ?? level.startPoint.x ?? 0;
                    const pY = player?.y ?? level.startPoint.y ?? 0;

                    // Overlay
                    drawConstraintsOverlay(ctx, width, height, toWorldX, toWorldY, compiledConstraints, t, pX, pY);
                }

                drawGrid(ctx, width, height, scale, ORIGIN_X, ORIGIN_Y, toWorldX, toWorldY);

                if (level.shapes) {
                    level.shapes.forEach(s => {
                        // Check if active. Default to true if no condition or if static/editor mode?
                        // In Editor (isStatic?), conditions might not be evaluating continuously. 
                        // If isStatic is true, activeShapeIds might be undefined? 
                        // If activeShapeIds is provided, use it. If not, assume active (filled).
                        // Or maybe assume active if no activeShapeIds passed.
                        const isActive = activeShapeIds ? activeShapeIds.has(s.id) : true;
                        // If shape has NO condition, it is always active (logic in useGameLoop confirms this: !isActive only if condition checks fail).
                        // useGameLoop: "activeShapeIds" only tracks shape.id IF isActive is true.
                        // So has(s.id) is correct check.

                        drawShape(ctx, s, toScreenX, toScreenY, scale, selectedId === s.id, isActive);
                    });
                }
                if (tempShape) drawShape(ctx, tempShape, toScreenX, toScreenY, scale, true, true);


                if (f && f.isValid) {
                    const pX = player?.x ?? level.startPoint.x ?? 0;
                    const pY = player?.y ?? level.startPoint.y ?? 0;

                    const isGameRunning = !!player && !isStatic;

                    // 1. Reference Graph y=f(x)
                    // Dotted, Hidden only if running
                    if (!isGameRunning) {
                        drawFunction(ctx, f, IDENTITY_G, width, toWorldX, toScreenY, t, pX, pY, a, true);
                    }

                    // 2. Transformed Graph y=g(f(x))
                    // Solid, ALWAYS Visible (Requested by user)
                    if (g && g.isValid) {
                        drawFunction(ctx, f, g, width, toWorldX, toScreenY, t, pX, pY, a, false);
                    }
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

                // Render Variable 'a' value
                if (level.playerVar?.enabled && !isStatic) {
                    ctx.save();
                    ctx.fillStyle = 'rgba(0, 255, 255, 0.8)';
                    ctx.font = 'bold 20px monospace';
                    ctx.textAlign = 'left';
                    ctx.textBaseline = 'bottom';
                    ctx.shadowColor = '#00ffff';
                    ctx.shadowBlur = 4;
                    // Position at bottom-left
                    ctx.fillText(`a = ${a.toFixed(2)}`, 10, height - 10);
                    ctx.restore();
                }

                // Player Coordinate Display REMOVED as per request.


                // Draw Coordinate Labels
                const showCoords = level.showCoordinates !== false;

                // HIDE coordinates if game is playing (indicated by player existing and not static)
                // Actually, player object exists even in Editor if we seek T?
                // But in PlayPage, player is passed ONLY when isPlaying.
                // in GameCanvas props: player?: {x, y}.
                // In Editor, player prop is passed? No, it uses internal state for editor?
                // Wait, EditorSidebar passes `player={undefined}` usually?
                // Let's check EditorSidebar... It passes `player` only if we want to visualize it?
                // Actually, let's use a simpler logic: If we are in Play Mode (implied by !isStatic and player being present?), hide labels.

                const isPlaying = !!player && !isStatic;
                const shouldShowLabels = showCoords && !isPlaying;

                const pointsToLabel: { p: DynamicPoint, label?: string }[] = [];

                if (shouldShowLabels) {
                    // Show labels for Start, Goal, Waypoints
                    pointsToLabel.push({ p: level.startPoint });
                    pointsToLabel.push({ p: level.goalPoint });
                    level.waypoints?.forEach(wp => pointsToLabel.push({ p: wp }));
                } else if (!isPlaying && selectedId) {
                    // Cautious check: Only show if explicitly selected
                    if (selectedId === 'start') pointsToLabel.push({ p: level.startPoint });
                    else if (selectedId === 'goal') pointsToLabel.push({ p: level.goalPoint });
                    else if (selectedId.startsWith('wp_')) {
                        const idx = parseInt(selectedId.split('_')[1]);
                        if (level.waypoints && level.waypoints[idx]) pointsToLabel.push({ p: level.waypoints[idx] });
                    }
                }

                // Draw accumulated labels
                const uniquePoints = new Set(pointsToLabel);
                uniquePoints.forEach(({ p }) => {
                    let px = p.x;
                    let py = p.y;

                    // Display Text Logic
                    let labelText = '';
                    if (p.xFormula || p.yFormula) {
                        // Use formula if available
                        const xStr = p.xFormula || p.x.toString();
                        const yStr = p.yFormula || p.y.toString();
                        labelText = `(${xStr}, ${yStr})`;
                    }

                    try {
                        const scope = { t, T: t, X: pX, Y: pY, a };
                        if (p.xFormula) px = MathEngine.evaluateScalar(p.xFormula, scope) || px;
                        if (p.yFormula) py = MathEngine.evaluateScalar(p.yFormula, scope) || py;
                    } catch { }

                    drawCoordinateLabel(ctx, { ...p, x: px, y: py }, toScreenX, toScreenY, labelText);
                });

                // If Static, STOP loop here (after one successful render)
                if (isStatic) {
                    return;
                }

            } catch (err: any) {
                console.error("Render Loop Error:", err);
            } finally {
                // If static, we might have returned early, so this finally block is tricky if we want to STOP.
                // Actually if checks isStatic above and returns, this finally block STILL runs in JS try/finally semantics if present?
                // Wait, if I return in try, finally block runs BEFORE returning.
                // So I need to control the requestAnimationFrame inside finally or check a flag.
            }

            // Standard loop continue
            animationFrameId = requestAnimationFrame(render);
        };

        render();
        return () => cancelAnimationFrame(animationFrameId);
    }, [rotation]); // Re-run if rotation (size) changes to restart loop even if static (to redraw once)


    // Snap Helper
    const snap = (v: number) => {
        // 0 step means no snap? User said default 0.5.
        const step = (snapStep > 0) ? snapStep : 0.0001;
        const val = Math.round(v / step) * step;
        return Math.round(val * 1e10) / 1e10; // Avoid fp errors
    };

    // ... (rest of hook)

    const handleMouseUp = () => {
        if (dragState?.type === 'create_shape' && tempShape) {
            // Prevent Zero Size
            if (tempShape.type === 'rect') {
                if (tempShape.width > 0 && tempShape.height > 0) {
                    if (onShapeCreate) onShapeCreate(tempShape);
                }
            } else if (tempShape.type === 'circle') {
                if (tempShape.radius > 0) {
                    if (onShapeCreate) onShapeCreate(tempShape);
                }
            }
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
