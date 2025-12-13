import React from 'react';

export const PlayPage: React.FC = () => {
    return (
        <div className="h-full flex items-center justify-center relative">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neon-pink/5 via-transparent to-transparent pointer-events-none" />
            <div className="text-center p-8 border border-neon-pink/30 rounded-xl bg-neon-surface/50 backdrop-blur-sm max-w-2xl">
                <h2 className="text-4xl font-bold mb-4 text-neon-pink font-mono">PLAY MODE</h2>
                <p className="text-gray-300 mb-8">
                    Enter <code className="text-neon-blue">f(x)</code> to guide the particle to the goal.
                </p>
                <div className="flex flex-col gap-4 items-center">
                    <div className="w-full h-48 bg-black/50 rounded-lg border border-white/10 flex items-center justify-center">
                        <span className="text-gray-600 font-mono">Graph View Canvas Placeholder</span>
                    </div>
                    <button className="px-8 py-3 bg-neon-pink text-black font-bold rounded hover:bg-neon-pink/80 transition-colors shadow-[0_0_15px_rgba(255,0,255,0.4)]">
                        START LEVEL
                    </button>
                </div>
            </div>
        </div>
    );
};
