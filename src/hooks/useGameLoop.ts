import { useState, useEffect, useRef, useCallback } from 'react';
import type { MathFunction } from '../core/math/MathEngine';
import { MathEngine } from '../core/math/MathEngine';
import { audioService } from '../services/AudioService';
import type { LevelConfig } from '../types/Level';

interface GameState {
    isPlaying: boolean;
    x: number;
    y: number;
    vx: number;
    t: number;
    a: number; // Player variable
    status: 'playing' | 'won' | 'lost' | 'idle';
    currentWaypointIndex: number;
}

export const useGameLoop = (f: MathFunction, g: MathFunction, level: LevelConfig) => {
    const [gameState, setGameState] = useState<GameState>({
        isPlaying: false,
        x: level.startPoint.x,
        y: level.startPoint.y,
        vx: 0,
        t: 0.001,
        a: 0,
        status: 'idle',
        currentWaypointIndex: 0
    });

    const [activeShapeIds, setActiveShapeIds] = useState<Set<string>>(new Set());
    const activeShapeIdsRef = useRef<Set<string>>(new Set());

    const [gRulesFunctions, setGRulesFunctions] = useState<{ fn: MathFunction, cond?: string, conditions?: string[][] }[]>([]);

    useEffect(() => {
        if (level.gRules && level.gRules.length > 0) {
            const compiled = level.gRules.map(r => ({
                fn: MathEngine.compile(r.expression),
                cond: r.condition,
                conditions: r.conditions
            }));
            setGRulesFunctions(compiled);
        } else {
            setGRulesFunctions([]);
        }
    }, [level.gRules]);

    const stateRef = useRef(gameState);
    stateRef.current = gameState;

    const requestRef = useRef<number | null>(null);
    const lastTimeRef = useRef<number | null>(null);
    const inputRef = useRef({ left: false, right: false, up: false, down: false });

    // Store latest params in ref to avoid closure staleness in loop
    const paramsRef = useRef({ level, f, g, gRulesFunctions });
    paramsRef.current = { level, f, g, gRulesFunctions };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') inputRef.current.left = true;
            if (e.key === 'ArrowRight') inputRef.current.right = true;
            if (e.key === 'ArrowUp') inputRef.current.up = true;
            if (e.key === 'ArrowDown') inputRef.current.down = true;
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') inputRef.current.left = false;
            if (e.key === 'ArrowRight') inputRef.current.right = false;
            if (e.key === 'ArrowUp') inputRef.current.up = false;
            if (e.key === 'ArrowDown') inputRef.current.down = false;
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    const evaluateComplex = (cond: string | undefined, conditions: string[][] | undefined, scope: any) => {
        // Priority: conditions (complex) > cond (legacy)
        if (conditions && conditions.length > 0) {
            // OR of AND groups
            for (const group of conditions) {
                let groupMatch = true;
                for (const c of group) {
                    if (!MathEngine.evaluateCondition(c, scope)) {
                        groupMatch = false;
                        break;
                    }
                }
                if (groupMatch && group.length > 0) return true;
            }
            return false;
        }
        if (cond && cond.trim() !== '') {
            return MathEngine.evaluateCondition(cond, scope);
        }
        // If neither exists, usually it implies "always true" unless logic dictates otherwise. 
        // For piecewise, if condition is empty it might be "else", but gRules usually requires condition.
        // Returning true here might be dangerous if empty means "true". 
        // Let's assume for rules/shapes if condition is present check it, otherwise true?
        // Actually for shapes, empty means true. For gRules, empty usually means true (default).
        return true;
    };

    const decideG = (x: number, y: number, t: number, a: number, defaultG: MathFunction, rules: { fn: MathFunction, cond?: string, conditions?: string[][] }[]) => {
        if (!rules || rules.length === 0) return defaultG;
        const scope = { x, y, X: x, Y: y, t, T: t, a };
        for (const rule of rules) {
            // If explicit conditions exist, check them
            const hasCond = (rule.cond && rule.cond.trim() !== '') || (rule.conditions && rule.conditions.length > 0);
            if (!hasCond) continue; // Skip rules without conditions (should be caught by default but safe to skip)

            if (evaluateComplex(rule.cond, rule.conditions, scope)) {
                return rule.fn;
            }
        }
        return defaultG;
    };

    const startGame = useCallback(() => {
        let startY = 0;
        const initialT = 0.01;
        const initialA = 0;
        try {
            const effectiveG = decideG(level.startPoint.x, 0, initialT, initialA, g, gRulesFunctions);
            startY = MathEngine.evaluateChain(effectiveG, f, level.startPoint.x, initialT, 0, initialA);
        } catch { startY = 0; }

        setGameState({
            isPlaying: true,
            x: level.startPoint.x,
            y: startY,
            vx: 0,
            t: initialT,
            a: initialA,
            status: 'playing',
            currentWaypointIndex: 0
        });

        // Reset active shapes
        activeShapeIdsRef.current = new Set();
        setActiveShapeIds(new Set());

        lastTimeRef.current = performance.now();
        requestRef.current = requestAnimationFrame(updateKey);
    }, [level, f, g, gRulesFunctions]);

    const stopGame = useCallback(() => {
        setGameState({
            isPlaying: false,
            x: level.startPoint.x,
            y: level.startPoint.y,
            vx: 0,
            t: 0.01,
            a: 0,
            status: 'idle',
            currentWaypointIndex: 0
        });
        // Clear active shapes
        activeShapeIdsRef.current = new Set();
        setActiveShapeIds(new Set());
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
    }, [level]);

    const updateKey = (time: number) => {
        if (!stateRef.current.isPlaying) return;

        const deltaTime = time - (lastTimeRef.current || time);
        lastTimeRef.current = time;

        const { level, f, g, gRulesFunctions } = paramsRef.current;
        let { x, y, vx, t, a, currentWaypointIndex } = stateRef.current;

        t += deltaTime / 1000;

        // Player Variable 'a' Physics
        if (level.playerVar?.enabled) {
            const speed = level.playerVar.speed ?? 1.0;
            const change = speed * (deltaTime / 1000);
            if (inputRef.current.up) a += change;
            if (inputRef.current.down) a -= change;
        }

        // Logic Physics: Units per Second
        const MAX_SPEED = level.playerSpeed ?? 5.0;
        const TIME_TO_MAX = 0.2;
        const ACCEL = (MAX_SPEED / TIME_TO_MAX) * (deltaTime / 1000);

        let moving = false;
        if (inputRef.current.left) { vx -= ACCEL; moving = true; }
        if (inputRef.current.right) { vx += ACCEL; moving = true; }

        if (!moving) {
            const damping = Math.pow(0.01, deltaTime / 1000);
            vx *= damping;
            if (Math.abs(vx) < 0.1) vx = 0;
        }

        if (Math.abs(vx) > MAX_SPEED) vx = Math.sign(vx) * MAX_SPEED;
        x += vx * (deltaTime / 1000);

        let nextY = 0;
        try {
            const effectiveG = decideG(x, y, t, a, g, gRulesFunctions);
            nextY = MathEngine.evaluateChain(effectiveG, f, x, t, y, a);
        } catch { nextY = NaN; }
        y = nextY;

        const scope = { x, y, X: x, Y: y, T: t, t, a };

        let hitConstraint = false;
        if (level.constraints) {
            for (const group of level.constraints) {
                let groupActive = true;
                for (const condition of group) {
                    if (!MathEngine.evaluateCondition(condition, scope)) {
                        groupActive = false;
                        break;
                    }
                }
                if (groupActive && group.length > 0) {
                    hitConstraint = true;
                    break;
                }
            }
        }

        const newActiveIds = new Set(activeShapeIdsRef.current);
        let statusChanged = false;

        if (!hitConstraint && level.shapes) {
            for (const shape of level.shapes) {
                // Condition Check
                let isActive = true;
                if (!evaluateComplex(shape.condition, shape.conditions, scope)) {
                    isActive = false;
                }

                // Logic for Sound Effect on State Change
                const wasActive = activeShapeIdsRef.current.has(shape.id);
                if (isActive !== wasActive) {
                    statusChanged = true;
                    if (isActive) newActiveIds.add(shape.id);
                    else newActiveIds.delete(shape.id);
                }

                if (!isActive) continue; // Skip physical collision if inactive

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

        if (statusChanged) {
            audioService.playSE('area');
            activeShapeIdsRef.current = newActiveIds;
            setActiveShapeIds(new Set(newActiveIds));
        }

        if (hitConstraint) {
            audioService.playSE('gameover');
            setGameState(prev => ({ ...prev, isPlaying: false, status: 'lost', x, y, vx, t, a }));
            return;
        }

        if (level.waypoints && currentWaypointIndex < level.waypoints.length) {
            const wp = level.waypoints[currentWaypointIndex];
            let wx = wp.x;
            let wy = wp.y;
            try {
                if (wp.xFormula) wx = MathEngine.evaluateScalar(wp.xFormula, scope);
                if (wp.yFormula) wy = MathEngine.evaluateScalar(wp.yFormula, scope);
            } catch { }

            const distSq = (x - wx) ** 2 + (y - wy) ** 2;
            const hitR = wp.radius || 0.1;
            if (distSq < hitR * hitR) {
                audioService.playSE('checkpoint');
                currentWaypointIndex++;
            }
        }

        if (!level.waypoints || currentWaypointIndex >= level.waypoints.length) {
            let gx = level.goalPoint.x;
            let gy = level.goalPoint.y;
            try {
                if (level.goalPoint.xFormula) gx = MathEngine.evaluateScalar(level.goalPoint.xFormula, scope);
                if (level.goalPoint.yFormula) gy = MathEngine.evaluateScalar(level.goalPoint.yFormula, scope);
            } catch { }

            const distSq = (x - gx) ** 2 + (y - gy) ** 2;
            const effectiveR = level.goalRadius > 0 ? level.goalRadius : 0.5;
            const hitR = Math.max(0.2, effectiveR);

            if (distSq < hitR * hitR) {
                audioService.playSE('clear');
                setGameState(prev => ({ ...prev, isPlaying: false, status: 'won', x, y, vx, t, a }));
                return;
            }
        }

        if (isNaN(y) || !isFinite(y)) {
            setGameState(prev => ({ ...prev, isPlaying: false, status: 'lost', x, y, vx, t, a }));
            return;
        }

        const newState = { isPlaying: true, x, y, vx, t, a, status: 'playing' as const, currentWaypointIndex };
        setGameState(newState);
        stateRef.current = newState;
        requestRef.current = requestAnimationFrame(updateKey);
    };

    const setA = (val: number) => {
        setGameState(prev => ({ ...prev, a: val }));
    };

    return { gameState, startGame, stopGame, setA, activeShapeIds };
};
