import { useState, useEffect, useRef, useCallback } from 'react';
import type { MathFunction } from '../core/math/MathEngine';
import { MathEngine } from '../core/math/MathEngine';
import type { LevelConfig, Point } from '../types/Level';

interface GameState {
    isPlaying: boolean;
    x: number;
    y: number;
    vx: number;
    t: number;
    status: 'playing' | 'won' | 'lost' | 'idle';
    currentWaypointIndex: number;
}

// Helper: Point in Polygon (Ray Casting)
function isPointInPoly(p: Point, vertices: Point[]): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > p.y) !== (yj > p.y))
            && (p.x < (xj - xi) * (p.y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}

export const useGameLoop = (f: MathFunction, g: MathFunction, level: LevelConfig) => {
    const [gameState, setGameState] = useState<GameState>({
        isPlaying: false,
        x: level.startPoint.x,
        y: level.startPoint.y,
        vx: 0,
        t: 0,
        status: 'idle',
        currentWaypointIndex: 0
    });

    const stateRef = useRef(gameState);
    stateRef.current = gameState;

    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const inputRef = useRef({ left: false, right: false });

    // Store latest params in ref to avoid closure staleness in loop
    const paramsRef = useRef({ level });
    paramsRef.current = { level };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') inputRef.current.left = true;
            if (e.key === 'ArrowRight') inputRef.current.right = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') inputRef.current.left = false;
            if (e.key === 'ArrowRight') inputRef.current.right = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const startGame = useCallback(() => {
        let startY = 0;
        try {
            const fx = f.compiled({ x: level.startPoint.x, T: 0 });
            startY = g.compiled({
                f: fx,
                x: level.startPoint.x,
                X: level.startPoint.x,
                T: 0
            });
        } catch { startY = 0; }

        setGameState({
            isPlaying: true,
            x: level.startPoint.x,
            y: startY,
            vx: 0,
            t: 0,
            status: 'playing',
            currentWaypointIndex: 0
        });
        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(updateKey);
    }, [level, f, g]);

    const stopGame = useCallback(() => {
        // Reset to initial state
        setGameState({
            isPlaying: false,
            x: level.startPoint.x,
            y: level.startPoint.y,
            vx: 0,
            t: 0,
            status: 'idle',
            currentWaypointIndex: 0
        });
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
    }, [level]);

    const updateKey = (time: number) => {
        if (!stateRef.current.isPlaying) return;

        const deltaTime = time - (lastTimeRef.current || time);
        lastTimeRef.current = time;

        const { level } = paramsRef.current;

        // Physics: Units per Second
        const MAX_SPEED = level.playerSpeed ?? 5.0; // Default 5 units/sec
        // Acceleration to reach max speed in 0.2 seconds
        const TIME_TO_MAX = 0.2;
        const ACCEL = (MAX_SPEED / TIME_TO_MAX) * (deltaTime / 1000);

        let { x, y, vx, t, currentWaypointIndex } = stateRef.current;

        t += deltaTime / 1000;

        let moving = false;
        if (inputRef.current.left) { vx -= ACCEL; moving = true; }
        if (inputRef.current.right) { vx += ACCEL; moving = true; }

        if (!moving) {
            // Strong friction to stop
            const damping = Math.pow(0.01, deltaTime / 1000);
            vx *= damping;
            if (Math.abs(vx) < 0.1) vx = 0;
        }

        // Clamp Speed
        if (Math.abs(vx) > MAX_SPEED) vx = Math.sign(vx) * MAX_SPEED;

        // Apply Velocity (Units/sec * sec)
        x += vx * (deltaTime / 1000);


        let nextY = 0;
        try {
            const fx = f.compiled({ x, T: t });
            nextY = g.compiled({ f: fx, x, X: x, T: t });
        } catch { nextY = NaN; }
        y = nextY;

        const scope = { x, y, X: x, Y: y, T: t };

        let hitConstraint = false;
        for (const condition of level.constraints) {
            if (MathEngine.evaluateCondition(condition, scope)) {
                hitConstraint = true;
                break;
            }
        }

        if (!hitConstraint && level.shapes) {
            for (const shape of level.shapes) {
                if (shape.type === 'circle') {
                    const dx = x - shape.center.x;
                    const dy = y - shape.center.y;
                    if (dx * dx + dy * dy < shape.radius * shape.radius) {
                        hitConstraint = true;
                        break;
                    }
                } else if (shape.type === 'rect') {
                    if (x >= shape.x && x <= shape.x + shape.width &&
                        y >= shape.y && y <= shape.y + shape.height) {
                        hitConstraint = true;
                        break;
                    }
                }
            }
        }

        if (hitConstraint) {
            setGameState(prev => ({ ...prev, isPlaying: false, status: 'lost', x, y, vx, t }));
            return;
        }

        if (currentWaypointIndex < level.waypoints.length) {
            const wp = level.waypoints[currentWaypointIndex];
            const distSq = (x - wp.x) ** 2 + (y - wp.y) ** 2;
            if (distSq < 0.01) { // Radius 0.1
                currentWaypointIndex++;
            }
        }

        if (currentWaypointIndex >= level.waypoints.length) {
            const distSq = (x - level.goalPoint.x) ** 2 + (y - level.goalPoint.y) ** 2;
            const effectiveR = level.goalRadius;
            if (distSq < effectiveR * effectiveR) {
                setGameState(prev => ({ ...prev, isPlaying: false, status: 'won', x, y, vx, t }));
                return;
            }
        }

        if (isNaN(y) || !isFinite(y)) {
            setGameState(prev => ({ ...prev, isPlaying: false, status: 'lost', x, y, vx, t }));
            return;
        }

        const newState = { isPlaying: true, x, y, vx, t, status: 'playing' as const, currentWaypointIndex };
        setGameState(newState);
        stateRef.current = newState;
        requestRef.current = requestAnimationFrame(updateKey);
    };

    return { gameState, startGame, stopGame };
};
