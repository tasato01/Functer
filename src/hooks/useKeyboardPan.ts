import { useEffect, useRef } from 'react';
import { SettingsService } from '../services/SettingsService';

export const useKeyboardPan = (
    setViewOffset: React.Dispatch<React.SetStateAction<{ x: number, y: number }>>,
    enabled: boolean = true
) => {
    const frameRef = useRef<number>(0);
    const keys = useRef<{ [key: string]: boolean }>({});

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            // Don't move if typing in input/textarea/math-field
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'math-field') return;

            keys.current[e.code] = true;
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            keys.current[e.code] = false;
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    useEffect(() => {
        if (!enabled) return;

        const animate = () => {
            const speed = SettingsService.getMoveSpeed(); // Fetch fresh speed every frame/render
            // Or maybe better to fetch inside loop or passing as prop? 
            // Fetching from storage every frame might be expensive? 
            // Storage access is sync and fast usually, but let's trust it for now.
            // Actually, better to just let the component re-render if speed changes, 
            // but for smooth movement we want instant feedback.

            let dx = 0;
            let dy = 0;

            if (keys.current['KeyW'] || keys.current['ArrowUp']) dy += speed;
            if (keys.current['KeyS'] || keys.current['ArrowDown']) dy -= speed;
            if (keys.current['KeyA'] || keys.current['ArrowLeft']) dx += speed;
            if (keys.current['KeyD'] || keys.current['ArrowRight']) dx -= speed;

            if (dx !== 0 || dy !== 0) {
                setViewOffset(prev => ({
                    x: prev.x + dx,
                    y: prev.y + dy
                }));
            }

            frameRef.current = requestAnimationFrame(animate);
        };

        frameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frameRef.current);
    }, [enabled, setViewOffset]); // Re-start loop if enabled toggles
};
