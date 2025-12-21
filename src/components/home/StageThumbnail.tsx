import React, { useMemo } from 'react';
import { GameCanvas } from '../game/GameCanvas';
import { MathEngine } from '../../core/math/MathEngine';
import type { LevelConfig } from '../../types/Level';

interface StageThumbnailProps {
    level: LevelConfig;
    width?: number;
    height?: number;
    className?: string;
}

export const StageThumbnail: React.FC<StageThumbnailProps> = ({ level, width = 120, height = 90, className }) => {

    // Calculate bounds to fit content
    const { viewOffset, scale } = useMemo(() => {
        // Collect points of interest
        const points = [
            level.startPoint,
            level.goalPoint,
            ...(level.constraints?.flat().flatMap(() => {
                // Approximate constraint bounds?
                // For now just focus on S/G and maybe 0,0
                return [];
            }) || [])
        ];

        // Ensure we include origin or some context if points are too close
        if (Math.abs(level.startPoint.x - level.goalPoint.x) < 2) {
            points.push({ x: level.startPoint.x - 2, y: level.startPoint.y });
            points.push({ x: level.startPoint.x + 2, y: level.startPoint.y });
        }

        const minX = Math.min(...points.map(p => p.x), -5);
        const maxX = Math.max(...points.map(p => p.x), 5);
        const minY = Math.min(...points.map(p => p.y), -5);
        const maxY = Math.max(...points.map(p => p.y), 5);

        const contentWidth = maxX - minX;
        const contentHeight = maxY - minY;

        // Add padding
        const padX = contentWidth * 0.2;
        const padY = contentHeight * 0.2;

        const rangeX = contentWidth + padX * 2;
        const rangeY = contentHeight + padY * 2;

        // Determine scale to fit
        // canvas width / rangeX = scale
        const scaleX = width / rangeX;
        const scaleY = height / rangeY;
        const fitScale = Math.min(scaleX, scaleY);

        // Center
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;

        // viewOffset: {x: -centerX * scale, y: centerY * scale} (Note: y axis flipped in canvas logic usually? 
        // In GameCanvas: 
        // const screenX = (worldX * scale) + (width / 2) + viewOffset.x;
        // const screenY = (worldY * -scale) + (height / 2) + viewOffset.y;

        // We want (centerX, centerY) to be at (width/2, height/2)
        // screenX(centerX) = width/2
        // (centerX * scale) + width/2 + viewOffset.x = width/2 => viewOffset.x = -centerX * scale

        return {
            scale: Math.max(fitScale, 5), // Min scale 5
            viewOffset: { x: -centerX * fitScale, y: centerY * fitScale }
        };
    }, [level, width, height]);

    const fFn = useMemo(() => MathEngine.compile('0'), []);
    const gFn = useMemo(() => MathEngine.compile(level.g_raw || 'f'), [level.g_raw]);

    return (
        <div style={{ width, height }} className={`relative overflow-hidden bg-black border border-gray-800 rounded lg ${className}`}>
            <GameCanvas
                level={level}
                f={fFn}
                g={gFn}
                t={0}
                viewOffset={viewOffset}
                scale={scale}
                onViewChange={() => { }}
                mode="pan"
                selectedId={null}
                onSelect={() => { }}
                onLevelChange={() => { }}
                snapStep={1}
                className="w-full h-full pointer-events-none"
            // Hide controls if GameCanvas supports a 'minimal' prop? 
            // Currently it doesn't, but pointer-events-none prevents interaction.
            // We might want to disable grid labels if they are too small?
            />
            {/* Overlay to intercept any events just in case and darken slightly? */}
            <div className="absolute inset-0 z-10" />
        </div>
    );
};
