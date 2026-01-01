import React, { useEffect, useState } from 'react';

export const FloatingMathBackground: React.FC = () => {
    // Math formulas in "natural" (LaTeX-like) visual form
    const formulas = [
        "e^{i\\pi} + 1 = 0",
        "f(x) = \\sin(x)",
        "\\int f(x)dx",
        "x^2 + y^2 = r^2",
        "E = mc^2",
        "\\frac{d}{dx}e^x = e^x",
        "F = ma",
        "\\sum \\frac{1}{n^2} = \\frac{\\pi^2}{6}"
    ];

    // Simple parser to render basic LaTeX-like strings purely with HTML/CSS
    // This is much lighter than loading MathJax/KaTeX for a simple background
    const renderMath = (latex: string) => {
        // Basic replacements for visual "LaTeX-ness"
        const content = latex
            .replace(/\\sin/g, 'sin')
            .replace(/\\cos/g, 'cos')
            .replace(/\\pi/g, 'π')
            .replace(/\\int/g, '∫')
            .replace(/\\sum/g, '∑')
            .replace(/\\frac{([^}]+)}{([^}]+)}/g, '($1/$2)') // Simplify frac for background
            .replace(/\^2/g, '²')
            .replace(/_0/g, '₀')
            .replace(/\\to/g, '→')
            .replace(/\\infty/g, '∞')
            .replace(/\\{/g, '{')
            .replace(/\\}/g, '}')
            .replace(/\\/g, ''); // Remove remaining backslashes

        return <span className="font-serif italic">{content}</span>;
    };

    // Use CSS animations for performance (GPU acceleration)
    // We generate random particles that float around
    const [particles, setParticles] = useState<CSSParticle[]>([]);

    interface CSSParticle {
        id: number;
        text: string;
        left: string;
        top: string;
        duration: string;
        delay: string;
        opacity: number;
        scale: number;
        tx: string; // Transform X
        ty: string; // Transform Y
    }

    useEffect(() => {
        const count = 15;
        const newParticles: CSSParticle[] = [];
        for (let i = 0; i < count; i++) {
            newParticles.push({
                id: i,
                text: formulas[Math.floor(Math.random() * formulas.length)],
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                duration: `${20 + Math.random() * 20}s`, // Slower, calmer
                delay: `-${Math.random() * 20}s`, // Start at random times
                opacity: 0.1 + Math.random() * 0.2, // Subtle
                scale: 0.8 + Math.random() * 0.5,
                // Random drift direction
                tx: `${(Math.random() - 0.5) * 50}vw`,
                ty: `${(Math.random() - 0.5) * 50}vh`
            });
        }
        setParticles(newParticles);
    }, []);

    return (
        <div className="fixed inset-0 z-0 bg-black overflow-hidden pointer-events-none select-none">
            {particles.map(p => (
                <div
                    key={p.id}
                    style={{
                        position: 'absolute',
                        left: p.left,
                        top: p.top,
                        opacity: p.opacity,
                        transform: `scale(${p.scale})`,
                        color: 'rgba(100, 200, 255, 0.8)',
                        fontSize: '1.5rem',
                        textShadow: '0 0 5px rgba(100,200,255,0.3)',
                        // Animation definition
                        animation: `float-${p.id} ${p.duration} ease-in-out infinite alternate`
                    }}
                >
                    {renderMath(p.text)}
                    <style>
                        {`
                            @keyframes float-${p.id} {
                                0% { transform: translate(0, 0) scale(${p.scale}) rotate(-5deg); }
                                100% { transform: translate(${p.tx}, ${p.ty}) scale(${p.scale}) rotate(5deg); }
                            }
                        `}
                    </style>
                </div>
            ))}

            {/* Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.8)_100%)]" />
        </div>
    );
};
