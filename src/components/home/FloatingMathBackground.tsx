import React, { useEffect, useRef } from 'react';

export const FloatingMathBackground: React.FC = () => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        let animationFrameId: number;
        let time = 0;

        // Formulas to display
        const formulas = [
            "e^{i\\pi} + 1 = 0",
            "f(x) = \\sin(x)",
            "\\int f(x)dx",
            "x^2 + y^2 = r^2",
            "\\nabla \\cdot E = \\frac{\\rho}{\\epsilon_0}",
            "E = mc^2",
            "\\frac{d}{dx}e^x = e^x",
            "\\lim_{x\\to 0} \\frac{\\sin x}{x} = 1",
            "F = ma",
            "\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}",
            "\\mathcal{F}(\\omega) = \\int_{-\\infty}^{\\infty} f(t)e^{-i\\omega t}dt"
        ];

        // Particle class-like structure
        interface FormulaParticle {
            text: string;
            x: number;
            y: number;
            z: number; // For depth effect
            vx: number;
            vy: number;
            vz: number;
            rotation: number;
            rotationSpeed: number;
        }

        const particles: FormulaParticle[] = [];
        const PARTICLE_COUNT = 15;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Init particles
            particles.length = 0;
            for (let i = 0; i < PARTICLE_COUNT; i++) {
                particles.push(createParticle());
            }
        };

        const createParticle = (): FormulaParticle => {
            return {
                text: formulas[Math.floor(Math.random() * formulas.length)],
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                z: Math.random() * 2 + 1, // Depth scale 1 to 3
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5,
                vz: (Math.random() - 0.5) * 0.01,
                rotation: Math.random() * Math.PI * 2,
                rotationSpeed: (Math.random() - 0.5) * 0.005
            };
        };

        window.addEventListener('resize', resize);
        resize();

        const render = () => {
            time += 0.01;

            // Clear with slight fade for trails? No, just clear
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Draw Background Gradient (subtle)
            // ctx.fillStyle = '#000000';
            // ctx.fillRect(0, 0, canvas.width, canvas.height);


            particles.forEach((p) => {
                // Update
                p.x += p.vx;
                p.y += p.vy;
                p.z += p.vz;
                p.rotation += p.rotationSpeed;

                // Wrap around
                if (p.x < -100) p.x = canvas.width + 100;
                if (p.x > canvas.width + 100) p.x = -100;
                if (p.y < -50) p.y = canvas.height + 50;
                if (p.y > canvas.height + 50) p.y = -50;
                if (p.z < 0.5 || p.z > 4) p.vz *= -1;

                // Draw
                const scale = 1 / p.z;
                const alpha = Math.min(0.3, Math.max(0.05, (1 - (p.z - 1) / 3) * 0.3)); // Fade out max z

                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rotation);
                ctx.scale(scale, scale);

                ctx.fillStyle = `rgba(100, 200, 255, ${alpha})`;
                ctx.font = 'italic 20px "Times New Roman", serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.fillText(p.text, 0, 0);

                ctx.restore();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <canvas
            ref={canvasRef}
            className="fixed inset-0 z-0 pointer-events-none"
            style={{ background: 'black' }}
        />
    );
};
