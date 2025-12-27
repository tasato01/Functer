import type { LevelConfig, Point, CircleConstraint, RectConstraint, DynamicPoint } from '../../types/Level';
import type { MathFunction } from '../../core/math/MathEngine';
import { MathEngine } from '../../core/math/MathEngine';

// --- Visual Constants ---
const COLORS = {
    NEON_PINK: '#ff00ff',
    NEON_BLUE: '#00ffff',
    NEON_GREEN: '#00ff00',
    NEON_YELLOW: '#ffff00',
    TEXT_GRAY: '#555555',
    GRID_MAIN: '#666',
    GRID_SUB: '#333',
    GRID_TEXT: '#888'
};

// Constraints Overlay - Optimized with Adaptive Sampling
export type CompiledConstraints = MathFunction[][];

export function compileConstraints(constraints: string[][]): CompiledConstraints {
    if (!constraints) return [];
    return constraints.map(group =>
        group
            .filter(c => c && c.trim())
            .map(c => MathEngine.compile(c))
            .filter(f => f.isValid)
    ).filter(group => group.length > 0);
}

export function isForbidden(x: number, y: number, compiledGroups: CompiledConstraints, scope: any): boolean {
    scope.x = x;
    scope.y = y;

    for (const group of compiledGroups) {
        let groupActive = true;
        for (const func of group) {
            try {
                // Logic AND for conditions in group
                if (func.native) {
                    if (!func.native(scope)) { groupActive = false; break; }
                } else if (func.code) {
                    if (!func.code.evaluate(scope)) { groupActive = false; break; }
                } else {
                    if (!func.compiled(scope)) { groupActive = false; break; }
                }
            } catch { groupActive = false; break; }
        }
        if (groupActive) return true; // Logic OR for groups
    }
    return false;
}

export function drawConstraintsOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    toWorldX: (x: number) => number,
    toWorldY: (y: number) => number,
    compiledGroups: CompiledConstraints,
    t: number,
    pX: number,
    pY: number
) {
    if (!compiledGroups || compiledGroups.length === 0) return;

    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)';

    // Scope reuse
    const scope = { x: 0, y: 0, X: pX, Y: pY, T: t, t: t };

    // Helper to evaluate a point (Screen Coords -> World Coords -> Evaluate)
    const checkPoint = (sx: number, sy: number) => {
        const wx = toWorldX(sx);
        const wy = toWorldY(sy);
        return isForbidden(wx, wy, compiledGroups, scope);
    };

    // Adaptive Recursive Function
    const BLOCK_SIZE = 32;
    const MIN_SIZE = 4;

    const processBlock = (x: number, y: number, size: number) => {
        // Check 4 corners and center
        // Optimization: We could pass corner values from parent to avoid re-evaluating, 
        // but for simplicity and code size, we eval here. Cache could be added if needed.
        const tl = checkPoint(x, y);
        const tr = checkPoint(x + size, y);
        const bl = checkPoint(x, y + size);
        const br = checkPoint(x + size, y + size);
        const center = checkPoint(x + size / 2, y + size / 2);

        if (tl === tr && tl === bl && tl === br && tl === center) {
            // Uniform block
            if (tl) {
                // All true -> Draw rect
                ctx.fillRect(x, y, size, size);
            }
            // If all false, skip
            return;
        }

        // Mixed block
        if (size > MIN_SIZE) {
            const half = size / 2;
            processBlock(x, y, half);
            processBlock(x + half, y, half);
            processBlock(x, y + half, half);
            processBlock(x + half, y + half, half);
        } else {
            // Reached min size, just scan pixels (or draw 1px rects)
            // Stride 1 or 2 for final detail
            const stride = 1;
            for (let py = y; py < y + size; py += stride) {
                for (let px = x; px < x + size; px += stride) {
                    if (checkPoint(px, py)) {
                        ctx.fillRect(px, py, stride, stride);
                    }
                }
            }
        }
    };

    // Start Processing
    // We loop over the screen in large blocks
    for (let y = 0; y < height; y += BLOCK_SIZE) {
        for (let x = 0; x < width; x += BLOCK_SIZE) {
            // Clip to screen size (handle edge blocks)
            // Actually processBlock handles the drawing, but checkPoint logic is fine with out of bounds logic?
            // Yes, toWorldX works for any X.
            // Just ensure we don't draw outside canvas too much (ctx clips anyway).

            // Note: If width is not multiple of BLOCK_SIZE, the last block might be partial.
            // We can just pass full block size, ctx clips.
            processBlock(x, y, BLOCK_SIZE);
        }
    }
}

export function drawGrid(
    ctx: CanvasRenderingContext2D, w: number, h: number, scale: number, ox: number, oy: number,
    toWorldX: (sx: number) => number,
    toWorldY: (sy: number) => number
) {
    ctx.lineWidth = 1;
    ctx.strokeStyle = COLORS.GRID_SUB;
    ctx.fillStyle = COLORS.GRID_TEXT;
    ctx.font = '10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    const gridStep = scale < 10 ? 10 : (scale < 40 ? 5 : 1);

    const startX = Math.floor(toWorldX(0) / gridStep) * gridStep;
    const endX = Math.ceil(toWorldX(w) / gridStep) * gridStep;
    const startY = Math.floor(toWorldY(h) / gridStep) * gridStep;
    const endY = Math.ceil(toWorldY(0) / gridStep) * gridStep;

    ctx.beginPath();
    for (let x = startX; x <= endX; x += gridStep) {
        const sx = Math.floor(ox + x * scale) + 0.5;
        if (sx < 0 || sx > w) continue;
        ctx.moveTo(sx, 0); ctx.lineTo(sx, h);
        if (Math.abs(x) > 0.001) {
            ctx.fillText(Number(x.toFixed(1)).toString(), sx, oy + 6);
        }
    }

    ctx.textAlign = 'right';
    const minWy = Math.min(startY, endY);
    const maxWy = Math.max(startY, endY);

    for (let y = minWy; y <= maxWy; y += gridStep) {
        const sy = Math.floor(oy - y * scale) + 0.5;
        if (sy < 0 || sy > h) continue;
        ctx.moveTo(0, sy); ctx.lineTo(w, sy);
        if (Math.abs(y) > 0.001) {
            ctx.fillText(Number(y.toFixed(1)).toString(), ox - 6, sy - 3);
        }
    }
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.GRID_MAIN;
    ctx.beginPath();
    const axisY = Math.floor(oy) + 0.5;
    const axisX = Math.floor(ox) + 0.5;
    if (axisY >= 0 && axisY <= h) { ctx.moveTo(0, axisY); ctx.lineTo(w, axisY); }
    if (axisX >= 0 && axisX <= w) { ctx.moveTo(axisX, 0); ctx.lineTo(axisX, h); }
    ctx.stroke();
}

export function drawFunction(
    ctx: CanvasRenderingContext2D,
    f: MathFunction, g: MathFunction,
    width: number,
    toWorldX: (s: number) => number,
    toScreenY: (y: number) => number,
    t: number, pX: number, pY: number, a: number = 0
) {
    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = COLORS.NEON_PINK;
    ctx.shadowColor = COLORS.NEON_PINK;
    ctx.shadowBlur = 10;

    ctx.beginPath();
    let first = true;
    for (let sx = 0; sx <= width; sx += 3) {
        const x = toWorldX(sx);
        let y = NaN;
        try {
            const fx = f.compiled({ x, t, T: t, a });
            // Expose F for integration inside g
            const F = (val: number) => {
                try { return f.compiled({ x: val, t, T: t, a }); } catch { return 0; }
            };
            const derivative_f = (val: number) => MathEngine.numericalDerivative(F, val);
            y = g.compiled({ f: fx, x, X: pX, Y: pY, t, T: t, F, derivative_f, a });
        } catch { y = NaN; }

        if (isNaN(y) || !isFinite(y)) { first = true; continue; }
        const sy = toScreenY(y);
        if (Math.abs(sy) > 10000) { if (first) ctx.moveTo(sx, sy); continue; }

        if (first) { ctx.moveTo(sx, sy); first = false; } else { ctx.lineTo(sx, sy); }
    }
    ctx.stroke();
    ctx.restore();
}

export function drawShape(ctx: CanvasRenderingContext2D, s: CircleConstraint | RectConstraint, toSX: any, toSY: any, scale: number, selected: boolean) {
    ctx.fillStyle = 'rgba(255, 0, 0, 0.15)';
    ctx.strokeStyle = selected ? '#fff' : 'rgba(255, 0, 0, 0.5)';
    ctx.lineWidth = 2;

    if (s.type === 'circle') {
        const cx = toSX(s.center.x);
        const cy = toSY(s.center.y);
        const r = s.radius * scale;
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        if (selected) {
            ctx.fillStyle = '#fff';
            ctx.beginPath(); ctx.arc(cx + r, cy, 4, 0, Math.PI * 2); ctx.fill();
        }
    } else {
        const x = toSX(s.x);
        const screenTop = toSY(s.y + s.height);
        const w = s.width * scale;
        const h = s.height * scale;

        ctx.beginPath();
        ctx.rect(x, screenTop, w, h);
        ctx.fill(); ctx.stroke();

        if (selected) {
            ctx.fillStyle = '#fff';
            const screenBottom = toSY(s.y);
            [
                { x: x, y: screenTop },
                { x: x + w, y: screenTop },
                { x: x + w, y: screenBottom },
                { x: x, y: screenBottom }
            ].forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
            });
        }
    }
}

export function drawWaypoint(ctx: CanvasRenderingContext2D, p: DynamicPoint, i: number, toSX: any, toSY: any, selected: boolean, passed: boolean, t: number, pX: number, pY: number) {
    let x = p.x;
    let y = p.y;
    try {
        const scope = { t, T: t, X: pX, Y: pY };
        if (p.xFormula) {
            const res = MathEngine.evaluateScalar(p.xFormula, scope);
            if (!isNaN(res)) x = res;
        }
        if (p.yFormula) {
            const res = MathEngine.evaluateScalar(p.yFormula, scope);
            if (!isNaN(res)) y = res;
        }
    } catch { }

    const cx = toSX(x);
    const cy = toSY(y);

    ctx.save();
    ctx.translate(cx, cy);

    if (passed) {
        ctx.fillStyle = COLORS.TEXT_GRAY;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText((i + 1).toString(), 0, -8);

        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        // Updated visual for passed waypoint: Inconspicuous Gray
        ctx.fillStyle = '#444444';
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        const size = 6;
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.fill();
        ctx.strokeStyle = '#666666';
        ctx.lineWidth = 1;
        ctx.stroke();
    } else {
        ctx.fillStyle = selected ? COLORS.NEON_YELLOW : COLORS.NEON_BLUE;
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText((i + 1).toString(), 0, -8);

        ctx.rotate(Math.PI / 4);
        ctx.beginPath();
        ctx.fillStyle = selected ? 'rgba(255, 255, 0, 0.9)' : 'rgba(0, 255, 255, 0.9)';
        ctx.shadowColor = selected ? COLORS.NEON_YELLOW : COLORS.NEON_BLUE;
        ctx.shadowBlur = 10;

        const size = 6;
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }
    ctx.restore();
}

export function drawEntities(ctx: CanvasRenderingContext2D, level: LevelConfig, toSX: any, toSY: any, scale: number, selectedId: string | null, t: number, pX: number, pY: number) {
    const evalPos = (p: DynamicPoint) => {
        let x = p.x;
        let y = p.y;
        try {
            const scope = { t, T: t, X: pX, Y: pY };
            if (p.xFormula) {
                const res = MathEngine.evaluateScalar(p.xFormula, scope);
                if (!isNaN(res)) x = res;
            }
            if (p.yFormula) {
                const res = MathEngine.evaluateScalar(p.yFormula, scope);
                if (!isNaN(res)) y = res;
            }
        } catch { }
        return { x, y };
    };

    // Start
    const startPos = evalPos(level.startPoint);
    const sx = toSX(startPos.x);
    const sy = toSY(startPos.y);

    if (isFinite(sx) && isFinite(sy)) {
        ctx.save();
        ctx.shadowColor = COLORS.NEON_GREEN;
        ctx.shadowBlur = 15;
        ctx.fillStyle = COLORS.NEON_GREEN;
        ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (selectedId === 'start') {
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.font = 'bold 12px sans-serif';
        ctx.fillStyle = COLORS.NEON_GREEN;
        ctx.textAlign = 'center'; ctx.fillText("START", sx, sy - 25);
    }

    // Goal
    const goalPos = evalPos(level.goalPoint);
    const gx = toSX(goalPos.x);
    const gy = toSY(goalPos.y);

    if (isFinite(gx) && isFinite(gy)) {
        if (level.goalRadius > 0) {
            ctx.beginPath();
            ctx.fillStyle = 'rgba(255, 255, 0, 0.1)';
            ctx.strokeStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.arc(gx, gy, level.goalRadius * scale, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();
        }

        ctx.save();
        ctx.shadowColor = COLORS.NEON_YELLOW;
        ctx.shadowBlur = 15;
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.fill();
        ctx.restore();

        if (selectedId === 'goal') {
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(gx, gy, 6, 0, Math.PI * 2); ctx.stroke();
        }
        ctx.fillStyle = COLORS.NEON_YELLOW;
        ctx.fillText("GOAL", gx, gy - 25);
    }
}

export function drawPlayer(ctx: CanvasRenderingContext2D, p: any, toSX: any, toSY: any) {
    const cx = toSX(p.x);
    const cy = toSY(p.y);

    ctx.save();
    ctx.shadowColor = COLORS.NEON_PINK; // Neon Pink Glow (Same as Function)
    ctx.shadowBlur = 20;

    // Core
    ctx.fillStyle = COLORS.NEON_PINK; // Neon Pink Core (Matches Function)
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.fill(); // Radius 6 (Matches Start/Goal)

    // Outer Ring
    ctx.strokeStyle = '#ffffff'; // White Border for visibility
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2); ctx.stroke();

    ctx.restore();
}

export function drawHoverTooltip(ctx: CanvasRenderingContext2D, p: Point, toSX: any, toSY: any) {
    const cx = toSX(p.x);
    const cy = toSY(p.y);
    const text = `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(cx + 10, cy + 10, ctx.measureText(text).width + 10, 20);
    ctx.fillStyle = 'white';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx + 15, cy + 20);
}

export function drawCoordinateLabel(ctx: CanvasRenderingContext2D, p: Point, toSX: any, toSY: any, customText?: string) {
    const cx = toSX(p.x);
    const cy = toSY(p.y);
    const text = customText || `(${p.x.toFixed(2)}, ${p.y.toFixed(2)})`;

    ctx.font = 'bold 12px sans-serif';
    const metrics = ctx.measureText(text);
    const padding = 4;
    const w = metrics.width + padding * 2;
    const h = 20;

    // Draw below the object (offset by +25 pixels in screen Y)
    const labelX = cx - w / 2;
    const labelY = cy + 25;

    ctx.fillStyle = 'rgba(0,0,0,0.8)';
    ctx.strokeStyle = COLORS.NEON_BLUE;
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.roundRect(labelX, labelY, w, h, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = COLORS.NEON_BLUE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, cx, labelY + h / 2);
}


