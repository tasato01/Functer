import type { LevelConfig, Point, CircleConstraint, RectConstraint } from '../../types/Level';
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

// Constraints Overlay
export function drawConstraintsOverlay(
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    toWorldX: (x: number) => number,
    toWorldY: (y: number) => number,
    constraints: string[][],
    t: number,
    pX: number,
    pY: number
) {
    if (!constraints || constraints.length === 0) return;

    // Optimization: Pre-compile constraints to avoid parsing every pixel!
    const compiledGroups = constraints.map(group =>
        group
            .filter(c => c && c.trim())
            .map(c => MathEngine.compile(c))
            .filter(f => f.isValid)
    ).filter(group => group.length > 0);

    if (compiledGroups.length === 0) return;

    // Modest resolution
    // Stride 4 is good balance for Native optimization (1/16th pixels)
    const stride = 4;
    ctx.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Semi-transparent red

    // Reusable scope
    // Initialize with player positions for X, Y
    const scope = { x: 0, y: 0, X: pX, Y: pY, T: t, t: t };

    const startTime = performance.now();
    const TIMEOUT_MS = 100;

    for (let py = 0; py < height; py += stride) {
        if (performance.now() - startTime > TIMEOUT_MS) {
            // Safety break
            break;
        }

        for (let px = 0; px < width; px += stride) {
            const wx = toWorldX(px);
            const wy = toWorldY(py);

            // Update scope - ONLY Update variables x, y
            scope.x = wx;
            scope.y = wy;
            // X and Y remain fixed as Player Position (pX, pY)

            let hit = false;
            for (const group of compiledGroups) {
                let groupActive = true;
                for (const func of group) {
                    try {
                        // Priority 1: Native JS (Fastest)
                        if (func.native) {
                            if (!func.native(scope)) {
                                groupActive = false;
                                break;
                            }
                        }
                        // Priority 2: MathJS Compiled Code (Fast)
                        else if (func.code) {
                            if (!func.code.evaluate(scope)) {
                                groupActive = false;
                                break;
                            }
                        }
                        // Priority 3: Wrapper (Slowest)
                        else {
                            if (!func.compiled(scope)) {
                                groupActive = false;
                                break;
                            }
                        }
                    } catch {
                        groupActive = false;
                        break;
                    }
                }
                if (groupActive) {
                    hit = true;
                    break;
                }
            }

            if (hit) {
                ctx.fillRect(px, py, stride, stride);
            }
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
    t: number, pX: number, pY: number
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
            const fx = f.compiled({ x, t, T: t });
            // Expose F for integration inside g
            const F = (val: number) => {
                try { return f.compiled({ x: val, t, T: t }); } catch { return 0; }
            };
            const derivative_f = (val: number) => MathEngine.numericalDerivative(F, val);
            y = g.compiled({ f: fx, x, X: pX, Y: pY, t, T: t, F, derivative_f });
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

export function drawWaypoint(ctx: CanvasRenderingContext2D, p: Point, i: number, toSX: any, toSY: any, selected: boolean, passed: boolean) {
    const cx = toSX(p.x);
    const cy = toSY(p.y);

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
        ctx.fillStyle = 'rgba(100, 100, 100, 0.5)';
        const size = 6;
        ctx.rect(-size, -size, size * 2, size * 2);
        ctx.fill();
        ctx.strokeStyle = '#777777';
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

export function drawEntities(ctx: CanvasRenderingContext2D, level: LevelConfig, toSX: any, toSY: any, scale: number, selectedId: string | null) {
    // Start
    const sx = toSX(level.startPoint.x);
    const sy = toSY(level.startPoint.y);

    if (level.startRadius > 0) {
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.3)';
        ctx.arc(sx, sy, level.startRadius * scale, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke();
    }

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

    // Goal
    const gx = toSX(level.goalPoint.x);
    const gy = toSY(level.goalPoint.y);

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
