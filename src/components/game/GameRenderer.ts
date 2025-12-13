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

export function drawConstraintsOverlay(
    ctx: CanvasRenderingContext2D, w: number, h: number,
    toWorldX: (sx: number) => number,
    toWorldY: (sy: number) => number,
    constraints: string[], t: number
) {
    if (constraints.length === 0) return;

    // Optimize: Pre-compile constraints to avoid parsing every pixel
    // Note: In a real app, caching compiled functions outside render loop is better.
    const compiledConstraints = constraints
        .filter(c => c && c.trim())
        .map(c => MathEngine.compile(c));

    if (compiledConstraints.length === 0) return;

    const STEP = 8;
    const rows = Math.ceil(h / STEP);
    const cols = Math.ceil(w / STEP);
    const grid = new Uint8Array(rows * cols); // 0 = safe, 1 = forbidden

    // 1. Fill Grid
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const sx = c * STEP;
            const sy = r * STEP;
            const x = toWorldX(sx + STEP / 2);
            const y = toWorldY(sy + STEP / 2);
            let forbidden = false;
            const scope = { x, y, X: x, Y: y, T: t, t };

            for (const func of compiledConstraints) {
                if (func.isValid && func.compiled(scope)) {
                    forbidden = true;
                    break;
                }
            }
            if (forbidden) grid[r * cols + c] = 1;
        }
    }

    // 2. Draw Fill & Borders
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = 'rgba(255, 50, 50, 0.15)';

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r * cols + c]) {
                ctx.fillRect(c * STEP, r * STEP, STEP, STEP);
            }
        }
    }

    ctx.beginPath();
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (grid[r * cols + c]) {
                const sx = c * STEP;
                const sy = r * STEP;
                // Simple edge detection
                if (r > 0 && !grid[(r - 1) * cols + c]) { ctx.moveTo(sx, sy); ctx.lineTo(sx + STEP, sy); }
                if (r < rows - 1 && !grid[(r + 1) * cols + c]) { ctx.moveTo(sx, sy + STEP); ctx.lineTo(sx + STEP, sy + STEP); }
                if (c > 0 && !grid[r * cols + (c - 1)]) { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + STEP); }
                if (c < cols - 1 && !grid[r * cols + (c + 1)]) { ctx.moveTo(sx + STEP, sy); ctx.lineTo(sx + STEP, sy + STEP); }
            }
        }
    }
    ctx.stroke();
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
            y = g.compiled({ f: fx, x, X: pX, Y: pY, t, T: t });
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
