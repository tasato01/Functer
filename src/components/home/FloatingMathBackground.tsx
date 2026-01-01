import React, { useEffect, useRef } from 'react';

export const FloatingMathBackground: React.FC = () => {
    // Pure Math formulas (No Physics)
    const formulas = [
        "e^{i\\pi} + 1 = 0",
        "f(x) = \\sin(x)",
        "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
        "x^2 + y^2 = r^2",
        "\\sum_{n=1}^{\\infty} \\frac{1}{n^2} = \\frac{\\pi^2}{6}",
        "\\frac{d}{dx}e^x = e^x",
        "\\lim_{x\\to 0} \\frac{\\sin x}{x} = 1",
        "a^2 + b^2 = c^2",
        "\\chi(G) \\le \\Delta(G) + 1",
        "V - E + F = 2",
        "\\zeta(s) = \\sum_{n=1}^{\\infty} n^{-s}",
        "\\det(AB) = \\det(A)\\det(B)",
        "\\nabla \\times (\\nabla f) = 0",
        "\\oint_C \\vec{F} \\cdot d\\vec{r} = 0",
        "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"
    ];

    const renderMath = (latex: string) => {
        // Visual approximation for background aesthetic
        const content = latex
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\pi/g, 'π')
            .replace(/\\int/g, '∫')
            .replace(/\\sum/g, '∑')
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)')
            .replace(/\^2/g, '²')
            .replace(/_0/g, '₀')
            .replace(/\\to/g, '→')
            .replace(/\\infty/g, '∞')
            .replace(/\\le/g, '≤')
            .replace(/\\pm/g, '±')
            .replace(/\\sqrt/g, '√')
            .replace(/\\chi/g, 'χ')
            .replace(/\\Delta/g, 'Δ')
            .replace(/\\zeta/g, 'ζ')
            .replace(/\\det/g, 'det')
            .replace(/\\nabla/g, '∇')
            .replace(/\\times/g, '×')
            .replace(/\\oint/g, '∮')
            .replace(/\\cdot/g, '·')
            .replace(/\\vec/g, '')
            .replace(/[{}]/g, '')
            .replace(/\\/g, '');

        return <span className="font-serif italic">{content}</span>;
    };

    // JS-driven state for particles to ensuring strictly constant velocity and wrapping
    // Using refs for animation loop performance to avoid React re-renders every frame
    const containerRef = useRef<HTMLDivElement>(null);
    const requestRef = useRef<number>(0);
    const particleRefs = useRef<HTMLDivElement[]>([]);

    interface Particle {
        x: number;
        y: number;
        z: number; // Scale/Opacity factor
        vx: number;
        vy: number;
        rotation: number;
        rotationSpeed: number;
        text: string;
    }

    const particlesData = useRef<Particle[]>([]);

    useEffect(() => {
        // Init particles
        const count = 12; // Fewer items, nice and spaced out
        particlesData.current = Array.from({ length: count }).map(() => initParticle(true));

        const animate = () => {
            if (!containerRef.current) return;

            const width = window.innerWidth;
            const height = window.innerHeight;

            particlesData.current.forEach((p, i) => {
                const el = particleRefs.current[i];
                if (!el) return;

                // Move
                p.x += p.vx;
                p.y += p.vy;
                p.rotation += p.rotationSpeed;

                // Wrap around (enter/exit logic)
                // Allow them to go fully off screen before wrapping
                const margin = 200;
                if (p.x > width + margin) p.x = -margin;
                if (p.x < -margin) p.x = width + margin;
                if (p.y > height + margin) p.y = -margin;
                if (p.y < -margin) p.y = height + margin;

                // Apply transforms
                // Use 3D transform for hardware accel
                // Z determines scale and opacity
                const scale = 0.5 + p.z * 1.0; // 0.5 to 1.5
                const opacity = 0.1 + p.z * 0.4; // 0.1 to 0.5

                el.style.transform = `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rotation}deg) scale(${scale})`;
                el.style.opacity = opacity.toString();
            });

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, []);

    const initParticle = (randomPos: boolean): Particle => {
        const w = window.innerWidth;
        const h = window.innerHeight;
        return {
            x: randomPos ? Math.random() * w : -200, // Initial random scatter
            y: randomPos ? Math.random() * h : Math.random() * h,
            z: Math.random(), // 0 to 1
            vx: (Math.random() - 0.5) * 1.5, // Constant velocity x
            vy: (Math.random() - 0.5) * 1.5, // Constant velocity y
            rotation: Math.random() * 360,
            rotationSpeed: (Math.random() - 0.5) * 0.2, // Constant angular velocity
            text: formulas[Math.floor(Math.random() * formulas.length)]
        };
    };

    // We render the DIVs once, and update them via refs
    return (
        <div ref={containerRef} className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none select-none">
            {/* Dark Vignette Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,#1a1a1a_0%,#000000_100%)] opacity-50" />

            {Array.from({ length: 12 }).map((_, i) => (
                <div
                    key={i}
                    ref={el => { if (el) particleRefs.current[i] = el; }}
                    className="absolute whitespace-nowrap text-neon-blue/80 will-change-transform"
                    style={{
                        top: 0,
                        left: 0,
                        // Initial hidden state, updated by JS immediately
                        transform: 'translate3d(-1000px, -1000px, 0)',
                        fontSize: '2rem',
                    }}
                >
                    {renderMath(particlesData.current[i]?.text || "")}
                </div>
            ))}
        </div>
    );
};
