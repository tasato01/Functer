
import React, { useEffect, useRef } from 'react';

export const FloatingMathBackground: React.FC = () => {
    // User-specified Math formulas
    const formulas = [
        "(a \\pm b)^2 = a^2 \\pm 2ab + b^2",
        "(a + b)(a - b) = a^2 - b^2",
        "(x + a)(x + b) = x^2 + (a + b)x + ab",
        "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
        "a^2 + b^2 = c^2",
        "y = ax + b",
        "y = ax^2",
        "V = \\frac{1}{3}Sh",
        "S = 4\\pi r^2",
        "V = \\frac{4}{3}\\pi r^3",
        "x^3 \\pm y^3 = (x \\pm y)(x^2 \\mp xy + y^2)",
        "D = b^2 - 4ac",
        "\\tan \\theta = \\frac{\\sin \\theta}{\\cos \\theta}",
        "\\sin^2 \\theta + \\cos^2 \\theta = 1",
        "1 + \\tan^2 \\theta = \\frac{1}{\\cos^2 \\theta}",
        "\\frac{a}{\\sin A} = \\frac{b}{\\sin B} = \\frac{c}{\\sin C} = 2R",
        "a^2 = b^2 + c^2 - 2bc \\cos A",
        "S = \\frac{1}{2}bc \\sin A",
        "P(n,r) = \\frac{n!}{(n-r)!}",
        "C(n,r) = \\frac{n!}{r!(n-r)!}",
        "\\sin(\\alpha \\pm \\beta) = \\sin \\alpha \\cos \\beta \\pm \\cos \\alpha \\sin \\beta",
        "\\cos(\\alpha \\pm \\beta) = \\cos \\alpha \\cos \\beta \\mp \\sin \\alpha \\sin \\beta",
        "\\sin 2\\theta = 2 \\sin \\theta \\cos \\theta",
        "\\cos 2\\theta = \\cos^2 \\theta - \\sin^2 \\theta",
        "\\log_a MN = \\log_a M + \\log_a N",
        "a_n = a + (n-1)d",
        "S_n = \\frac{1}{2}n(a+l)",
        "a_n = ar^{n-1}",
        "S_n = \\frac{a(r^n - 1)}{r-1}",
        "\\sum_{k=1}^n k = \\frac{1}{2}n(n+1)",
        "\\lim_{x\\to 0} \\frac{\\sin x}{x} = 1",
        "\\{f(g(x))\\}' = f'(g(x))g'(x)",
        "(\\sin x)' = \\cos x",
        "(\\cos x)' = -\\sin x",
        "(e^x)' = e^x",
        "(\\log x)' = \\frac{1}{x}",
        "\\int \\log x dx = x \\log x - x + C",
        "V = \\pi \\int_a^b \\{f(x)\\}^2 dx",
        "z = r(\\cos \\theta + i \\sin \\theta)",
        "(\\cos \\theta + i \\sin \\theta)^n = \\cos n\\theta + i \\sin n\\theta"
    ];

    const renderMath = (latex: string) => {
        // Visual approximation for background aesthetic
        const content = latex
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\tan/g, 'tan')
            .replace(/\\log/g, 'log')
            .replace(/\\lim/g, 'lim')
            .replace(/\\pm/g, '±')
            .replace(/\\mp/g, '∓')
            .replace(/\\pi/g, 'π')
            .replace(/\\theta/g, 'θ')
            .replace(/\\alpha/g, 'α')
            .replace(/\\beta/g, 'β')
            .replace(/\\int/g, '∫')
            .replace(/\\sum/g, '∑')
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)')
            .replace(/\^2/g, '²')
            .replace(/\^3/g, '³')
            .replace(/_0/g, '₀')
            .replace(/\\to/g, '→')
            .replace(/\\infty/g, '∞')
            .replace(/\\le/g, '≤')
            .replace(/\\sqrt/g, '√')
            .replace(/\\{/g, '{')
            .replace(/\\}/g, '}')
            .replace(/[{}]/g, '')
            .replace(/\\/g, '');

        return <span className="font-serif italic text-gray-600/40">{content}</span>;
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
