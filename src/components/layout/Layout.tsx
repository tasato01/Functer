import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Terminal, Play, Edit3 } from 'lucide-react';
import { clsx } from 'clsx';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();

    return (
        <div className="flex flex-col h-screen bg-neon-dark text-white font-sans overflow-hidden">
            {/* Header */}
            <header className="h-16 border-b border-neon-blue/30 bg-neon-surface/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
                <div className="flex items-center gap-3">
                    <Terminal className="w-8 h-8 text-neon-pink animate-pulse" />
                    <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink filter drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                        FUNCTER
                    </h1>
                </div>

                <nav className="flex gap-4">
                    <NavLink to="/" icon={<Play size={18} />} label="PLAY" active={location.pathname === '/' || location.pathname === '/play'} />
                    <NavLink to="/edit" icon={<Edit3 size={18} />} label="EDIT" active={location.pathname === '/edit'} />
                </nav>
            </header>

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden">
                {children}
            </main>
        </div>
    );
};

const NavLink: React.FC<{ to: string; icon: React.ReactNode; label: string; active: boolean }> = ({ to, icon, label, active }) => (
    <Link
        to={to}
        className={clsx(
            "flex items-center gap-2 px-4 py-2 rounded-md transition-all duration-300 border border-transparent",
            active
                ? "bg-neon-blue/10 text-neon-blue border-neon-blue/50 shadow-[0_0_10px_rgba(0,243,255,0.2)]"
                : "text-gray-400 hover:text-white hover:bg-white/5"
        )}
    >
        {icon}
        <span className="font-mono font-bold">{label}</span>
    </Link>
);
