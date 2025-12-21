import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Terminal } from 'lucide-react';
import { audioService } from '../../services/AudioService';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const location = useLocation();

    useEffect(() => {
        const path = location.pathname;
        // BGM Logic
        // Home/List: 'home'
        // Play/Edit: Stop (Fade out)
        if (path === '/' || path.startsWith('/user/')) {
            audioService.playBGM('home');
        } else if (path.startsWith('/play') || path.startsWith('/edit')) {
            audioService.stopBGM(1000);
        }
    }, [location.pathname]);

    // Hide header on Home (/) and Play Mode (/play...) and Edit Mode (/edit)
    const shouldHideHeader = location.pathname === '/' || location.pathname.startsWith('/play') || location.pathname === '/edit';

    return (
        <div className="fixed inset-0 flex flex-col bg-neon-dark text-white font-sans overflow-hidden">
            {/* Header - Hide on Play Mode to maximize space */}
            {!shouldHideHeader && (
                <header className="h-16 border-b border-neon-blue/30 bg-neon-surface/80 backdrop-blur-md flex items-center justify-between px-6 shrink-0 z-50">
                    <div className="flex items-center gap-3">
                        <Terminal className="w-8 h-8 text-neon-pink animate-pulse" />
                        <h1 className="text-2xl font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-neon-blue to-neon-pink filter drop-shadow-[0_0_5px_rgba(0,243,255,0.5)]">
                            FUNCTER
                        </h1>
                    </div>

                    <div />
                </header>
            )}

            {/* Main Content */}
            <main className="flex-1 relative overflow-hidden">
                {children}
            </main>
        </div>
    );
};

