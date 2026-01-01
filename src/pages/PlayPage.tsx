import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { GameCanvas } from '../components/game/GameCanvas';
import { MathInput } from '../components/math/MathInput';
import { useGameLoop } from '../hooks/useGameLoop';
import { MathEngine } from '../core/math/MathEngine';
import { DEFAULT_LEVEL } from '../types/Level';
import type { LevelConfig } from '../types/Level';
import { Play, Square, Home, List, RefreshCw, AlertTriangle, HelpCircle, Plus, Minus } from 'lucide-react';
import { levelService } from '../services/FirebaseLevelService';
import { audioService } from '../services/AudioService';
import { HelpDialog } from '../components/common/HelpDialog';
import { SolutionDisplayDialog } from '../components/game/SolutionDisplayDialog';
import { LevelClearDialog } from '../components/game/LevelClearDialog';


export const PlayPage: React.FC = () => {
    const navigate = useNavigate();
    const { levelId } = useParams();
    const location = useLocation();

    // Determine back path based on where we came from
    const fromType = location.state?.from as string | undefined;
    const backPath = fromType === 'user' ? '/user' : '/official';
    const listLabel = fromType === 'user' ? 'COMMUNITY STAGES' : 'OFFICIAL STAGES';

    const [level, setLevel] = useState<LevelConfig | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!levelId) return;

        const loadLevel = async () => {
            setIsLoading(true);
            try {
                // Minimum load time of 800ms for smooth transition
                const [data, _] = await Promise.all([
                    levelService.getLevelById(levelId),
                    new Promise(resolve => setTimeout(resolve, 800))
                ]);

                if (data) {
                    setLevel(data);
                } else {
                    console.error("Level not found");
                }
            } catch (err) {
                console.error("Failed to load level", err);
            } finally {
                setIsLoading(false);
            }
        };
        loadLevel();
    }, [levelId]);

    const [fRaw, setFRaw] = useState('0'); // Player's Function
    const [viewOffset, setViewOffset] = useState({ x: 0, y: 0 });
    const [scale, setScale] = useState(40);

    const fFn = useMemo(() => MathEngine.compile(fRaw || '0'), [fRaw]);
    const gFn = useMemo(() => MathEngine.compile(level?.g_raw || '0'), [level?.g_raw]);

    const { gameState, startGame, stopGame, setA, activeShapeIds } = useGameLoop(fFn, gFn, level || DEFAULT_LEVEL);

    // List Context for "Next Stage"
    const listContextIds = location.state?.listContextIds as string[] | undefined;
    const currentListIndex = (listContextIds && level) ? listContextIds.indexOf(level.id) : -1;
    const hasNextLevel = listContextIds ? currentListIndex !== -1 && currentListIndex < listContextIds.length - 1 : false;

    const [isLiked, setIsLiked] = useState(false);

    // Reset interactions and game state on new level load
    useEffect(() => {
        setFRaw('0'); // Reset player function input
        stopGame();
        setIsLiked(false);
    }, [level?.id, stopGame]); // Only reset if level ID changes



    // Auto-center on load
    useEffect(() => {
        if (!level) return; // Only center if level data is loaded
        const cx = (level.startPoint.x + level.goalPoint.x) / 2;
        const cy = (level.startPoint.y + level.goalPoint.y) / 2;
        setViewOffset({ x: -cx * scale, y: cy * scale });
    }, [level?.startPoint, level?.goalPoint, scale]); // Re-center if points or scale change

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showHelp, setShowHelp] = useState(false);
    const [showSolutions, setShowSolutions] = useState(false);

    // Auto-submit solution on clear
    useEffect(() => {
        if (gameState.status === 'won' && level?.id && !level.id.startsWith('draft')) {
            // Check if user is logged in? Service handles anonymous.
            // But we should verify valid fRaw
            if (fFn.isValid) {
                levelService.submitPlayerSolution(level.id, fRaw);
            }
        }
    }, [gameState.status, level?.id, fRaw, fFn.isValid]);

    const handleNext = () => {
        audioService.playSE('click');
        if (!level) return;
        if (hasNextLevel && listContextIds) {
            const nextId = listContextIds[currentListIndex + 1];
            navigate(`/play/${nextId}`, { state: { ...location.state } });
        } else {
            navigate(backPath);
        }
    };

    const handleLike = () => {
        if (!level || isLiked) return;
        levelService.likeLevel(level.id);
        setIsLiked(true);
    };

    const handleTogglePlay = () => {
        audioService.playSE('play');
        if (!level) return;
        if (gameState.isPlaying) {
            stopGame();
        } else {
            if (!fFn.isValid) {
                alert("Function is invalid!");
                return;
            }

            // Check 'a' usage permission GLOBALLY
            // If playerVar is NOT enabled, 'a' cannot be used ANYWHERE (f, g, constraints, shapes, waypoints, goal)
            // User feedback: "If check is off, disallow usage in ALL formulas."
            if (!level.playerVar?.enabled) {
                // Check f(x)
                if (MathEngine.usesVariable(fRaw, 'a')) {
                    alert("Variable 'a' is NOT enabled for this level (cannot use in f(x)).");
                    return;
                }

                // We should also check if the level ITSELF is valid, but maybe just warn or block play if *f* is fine but *g* uses it?
                // The user said "If check is off... player cannot operate... so better to make it unusable in all formulas".
                // Since user cannot change g/shapes, this implies the LEVEL AUTHOR made a mistake.
                // We should block play and warn.
                const usesAInLevel = (
                    (level.g_raw && MathEngine.usesVariable(level.g_raw, 'a')) ||
                    (level.constraints && level.constraints.some(g => g.some(c => MathEngine.usesVariable(c, 'a')))) ||
                    (level.shapes && level.shapes.some(s =>
                        (s.conditions && s.conditions.some(g => g.some(c => MathEngine.usesVariable(c, 'a')))) ||
                        (s.condition && MathEngine.usesVariable(s.condition, 'a'))
                    )) ||
                    (level.waypoints && level.waypoints.some(wp => MathEngine.usesVariable(wp.xFormula || '', 'a') || MathEngine.usesVariable(wp.yFormula || '', 'a'))) ||
                    (level.goalPoint && (MathEngine.usesVariable(level.goalPoint.xFormula || '', 'a') || MathEngine.usesVariable(level.goalPoint.yFormula || '', 'a')))
                );

                if (usesAInLevel) {
                    alert("Level Error: Variable 'a' is used in Level Data but NOT enabled in settings.\n(Contact the author to fix this level).");
                    return;
                }
            }

            // Check if f(x) passes through Start Point
            let startY = 0;
            try {
                // t=0.01 for start check to avoid singularities at t=0
                startY = MathEngine.evaluateChain(gFn, fFn, level.startPoint.x, 0.01);
            } catch { startY = NaN; }

            if (isNaN(startY) || Math.abs(startY - level.startPoint.y) > 0.1) {
                alert("Function must pass through the Start Point (S)!");
                return;
            }

            startGame();
            levelService.incrementPlayCount(level.id);
        }
    };

    // Space Key to Toggle Play
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const activeTag = document.activeElement?.tagName.toLowerCase();
            if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'math-field') return;

            if (e.code === 'Space') {
                e.preventDefault(); // Prevent scrolling
                handleTogglePlay();
            }
            if (e.code === 'Enter') {
                if (gameState.isPlaying) {
                    e.preventDefault();
                    stopGame();
                    audioService.playSE('click');
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleTogglePlay]);

    // Auto-center on load
    useEffect(() => {
        if (!level || !level.startPoint || !level.goalPoint) return;
        const cx = (level.startPoint.x + level.goalPoint.x) / 2;
        const cy = (level.startPoint.y + level.goalPoint.y) / 2;
        setViewOffset({ x: -cx * scale, y: cy * scale });
    }, [level?.startPoint, level?.goalPoint]); // Only re-center if points change

    if (!level || isLoading) {
        return (
            <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center font-bold gap-4 animate-pulse">
                <div className="w-16 h-16 border-4 border-neon-blue border-t-transparent rounded-full animate-spin"></div>
                <div className="text-neon-blue tracking-widest">LOADING STAGE...</div>
            </div>
        );
    }

    return (
        <div className="absolute inset-0 flex flex-col bg-black text-white overflow-hidden">
            {/* Header / Nav */}
            <div className="h-14 bg-neon-surface/80 border-b border-neon-blue/30 flex items-center justify-between px-6 backdrop-blur-md z-20 shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={() => { audioService.playSE('click'); navigate('/'); }} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold">
                        <Home size={16} /> HOME
                    </button>
                    <div className="h-4 w-[1px] bg-white/10"></div>
                    <button onClick={() => { audioService.playSE('click'); navigate(backPath); }} className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm font-bold uppercase">
                        <List size={16} /> {listLabel}
                    </button>
                </div>

                <h2 className="font-bold text-lg text-neon-pink tracking-wider">
                    {level?.name || "UNTITLED LEVEL"}
                </h2>

                <div className="w-[100px] flex justify-end">
                    <button
                        onClick={() => setShowHelp(true)}
                        className="p-2 text-gray-400 hover:text-white transition-colors"
                        title="Help"
                    >
                        <HelpCircle size={20} />
                    </button>
                </div>
            </div>

            {/* Game Area */}
            <div className="flex-1 relative">
                <GameCanvas
                    f={fFn}
                    g={gFn}
                    level={level!}
                    t={gameState.isPlaying ? gameState.t : 0.001}
                    a={gameState.isPlaying ? gameState.a : 0}
                    player={gameState.isPlaying ? { x: gameState.x, y: gameState.y } : undefined}
                    currentWaypointIndex={gameState.currentWaypointIndex}

                    viewOffset={viewOffset}
                    activeShapeIds={activeShapeIds}
                    scale={scale}
                    onViewChange={(o, s) => { setViewOffset(o); setScale(s); }}

                    mode="select"
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onLevelChange={() => { }} // No-op
                    snapStep={0.5}

                    className="w-full h-full"
                />

                {/* Controls Overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 flex gap-4 items-end z-30">
                    {/* Function Input */}
                    <div className={`flex-1 bg-black/80 backdrop-blur-md border border-neon-blue/30 p-3 rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.5)] transition-opacity duration-300 ${gameState.isPlaying ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <label className="text-neon-blue text-xs font-bold mb-1 block flex justify-between">
                            <span>f(x) = ...</span>
                            {!fFn.isValid && <span className="text-red-500 text-[10px] flex items-center gap-1"><AlertTriangle size={10} /> Error</span>}
                        </label>
                        <MathInput
                            value={fRaw}
                            onChange={setFRaw}
                            disabled={gameState.isPlaying}
                            onEnter={handleTogglePlay}
                        />
                    </div>

                    {/* Play Button */}
                    <button
                        onClick={handleTogglePlay}
                        className={`h-[60px] w-[60px] rounded-full flex items-center justify-center shadow-lg transition-all ${gameState.isPlaying
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse text-white'
                            : 'bg-neon-green text-black hover:bg-neon-green/90 hover:scale-105'
                            }`}
                    >
                        {gameState.isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
                    </button>


                </div>

                {/* Zoom Controls & Reset - Moved to Top Right to avoid overlap */}
                <div className="absolute top-16 right-4 flex flex-col gap-2 z-40">
                    <button
                        onClick={() => {
                            if (!level) return;
                            const cx = (level.startPoint.x + level.goalPoint.x) / 2;
                            const cy = (level.startPoint.y + level.goalPoint.y) / 2;
                            setViewOffset({ x: -cx * scale, y: cy * scale });
                        }}
                        className="w-10 h-10 bg-gray-800 border border-gray-600 rounded flex items-center justify-center text-neon-blue hover:bg-gray-700 transition-colors shadow-lg"
                        title="Reset View"
                    >
                        <RefreshCw size={20} />
                    </button>
                    <ZoomControls onZoomIn={() => setScale(s => Math.min(s * 1.2, 200))} onZoomOut={() => setScale(s => Math.max(s / 1.2, 5))} />
                </div>

                {/* Game Info Overlay */}
                <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 max-w-[300px] pointer-events-none">
                    {/* g(f)(x) display */}
                    <div className="bg-black/60 backdrop-blur-md border border-neon-blue/30 p-3 rounded-lg overflow-hidden flex flex-col gap-1 max-h-[30vh]">
                        <span className="text-gray-400 text-xs font-mono block shrink-0">TRANSFORMATION</span>

                        <div className="flex flex-col gap-1 overflow-y-auto min-h-0">
                            {/* Piecewise Rules */}
                            {level.gRules?.map((rule, i) => {
                                const MathFieldTag = 'math-field' as any;
                                return (
                                    <div key={`rule-${i}`} className="text-[11px] bg-white/5 p-1 rounded border-l-2 border-neon-yellow/50 shrink-0">
                                        <div className="flex gap-2 items-center text-neon-yellow/80 mb-0.5 overflow-x-auto whitespace-nowrap scrollbar-thin">
                                            <span className="font-bold shrink-0">IF:</span>
                                            <MathFieldTag read-only style={{ display: 'inline-block', bg: 'transparent', color: 'inherit', border: 'none', fontSize: '0.9em' }}>
                                                {rule.condition}
                                            </MathFieldTag>
                                        </div>
                                        <div className="flex gap-2 items-center text-neon-pink overflow-x-auto whitespace-nowrap scrollbar-thin">
                                            <span className="font-bold shrink-0">THEN:</span>
                                            <MathFieldTag read-only style={{ display: 'inline-block', bg: 'transparent', color: 'inherit', border: 'none', fontSize: '0.9em' }}>
                                                {rule.expression}
                                            </MathFieldTag>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Default Case */}
                            <div className="overflow-x-auto whitespace-nowrap scrollbar-thin">
                                {level.gRules && level.gRules.length > 0 && <span className="text-[10px] text-gray-500 mr-1">ELSE:</span>}
                                {(() => {
                                    const MathFieldTag = 'math-field' as any;
                                    return (
                                        <MathFieldTag
                                            read-only
                                            style={{
                                                display: 'block',
                                                backgroundColor: 'transparent',
                                                color: '#f472b6', // neon-pink
                                                fontSize: '0.9em',
                                                padding: '4px 0',
                                                border: 'none',
                                                minWidth: '100%',
                                                fontWeight: 'bold'
                                            }}
                                        >
                                            {`g(f) = ${level?.g_raw || 'f'}`}
                                        </MathFieldTag>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Constraints & Forbidden Shapes display */}
                    {(level.showInequalities !== false) && ((level!.constraints && level!.constraints.length > 0) || (level!.shapes && level!.shapes.length > 0)) && (
                        <div
                            className="bg-black/60 backdrop-blur-md border border-red-500/30 p-3 rounded-lg overflow-hidden flex flex-col gap-1 max-h-[40vh]"
                            onWheel={(e) => e.stopPropagation()}
                            onTouchMove={(e) => e.stopPropagation()}
                        >
                            <span className="text-gray-400 text-xs font-mono block shrink-0">FORBIDDEN</span>
                            <div className="flex flex-col gap-2 overflow-y-auto min-h-0">
                                {/* Inequality Constraints */}
                                {level!.constraints?.map((group, i) => (
                                    <div key={`const-${i}`} className="text-center border-b border-red-500/20 last:border-0 pb-1 mb-1 last:mb-0 block">
                                        {group.map((c, j) => {
                                            const MathFieldTag = 'math-field' as any;
                                            return (
                                                <div key={j} className="inline-block max-w-full overflow-x-auto whitespace-nowrap scrollbar-thin">
                                                    {j > 0 && <span className="text-red-400 text-xs mx-1 font-bold">AND</span>}
                                                    <MathFieldTag
                                                        read-only
                                                        style={{
                                                            display: 'inline-block',
                                                            backgroundColor: 'transparent',
                                                            color: '#f87171', // red-400
                                                            border: 'none',
                                                            fontSize: '0.85em',
                                                            padding: '2px'
                                                        }}
                                                    >
                                                        {c}
                                                    </MathFieldTag>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Shape Constraints */}
                                {level!.shapes?.map((shape, i) => {
                                    const MathFieldTag = 'math-field' as any;
                                    const condition = (shape.conditions && shape.conditions[0] && shape.conditions[0][0]) || shape.condition;

                                    return (
                                        <div key={`shape-${i}`} className="bg-white/5 p-1 rounded border border-white/10 flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold uppercase">
                                                {shape.type === 'rect' ? <Square size={10} /> : <div className="w-2.5 h-2.5 rounded-full border border-gray-400" />}
                                                {shape.type}
                                                {/* Dimensions info if needed, e.g. R=... */}
                                            </div>

                                            {/* Condition if exists */}
                                            {condition && (
                                                <div className="border-t border-white/5 pt-1 mt-1">
                                                    <span className="text-[9px] text-red-400 mr-1">IF:</span>
                                                    <div className="overflow-x-auto whitespace-nowrap scrollbar-thin inline-block w-full align-bottom">
                                                        <MathFieldTag read-only style={{ display: 'inline-block', bg: 'transparent', color: '#f87171', border: 'none', fontSize: '0.8em' }}>
                                                            {condition}
                                                        </MathFieldTag>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Hint Button (if exists) */}
                    {level!.hint && (
                        <div className="pointer-events-auto">
                            <button
                                onClick={() => alert(`HINT: ${level!.hint}`)} // Simple alert for now, can be modal
                                className="bg-neon-yellow/10 border border-neon-yellow text-neon-yellow px-3 py-1 rounded text-xs font-bold hover:bg-neon-yellow/20 transition-colors"
                            >
                                💡 SHOW HINT
                            </button>
                        </div>
                    )}
                </div>

                {/* Game Over / Clear Overlay */}
                {/* Game Over / Clear Overlay */}
                {gameState.status === 'won' && (
                    <LevelClearDialog
                        onNext={handleNext}
                        onReplay={() => { audioService.playSE('click'); stopGame(); }}
                        onHome={() => { audioService.playSE('click'); navigate('/'); }}
                        onLike={() => { audioService.playSE('click'); handleLike(); }}
                        onRate={(r) => { if (level?.id) levelService.rateLevel(level.id, r); }}
                        onShowSolutions={() => { audioService.playSE('click'); setShowSolutions(true); }}
                        isLiked={isLiked}
                        userRating={null} // TODO: Fetch user rating
                        hasNextLevel={hasNextLevel}
                    />
                )}

                {/* Dynamic Variable Controls - Show if enabled OR used in level */}
                {(() => {
                    const isAEnabled = level?.playerVar?.enabled ?? false;
                    const usedInLevel = level && (
                        (level.g_raw && MathEngine.usesVariable(level.g_raw, 'a')) ||
                        (level.constraints && level.constraints.some(g => g.some(c => MathEngine.usesVariable(c, 'a')))) ||
                        (level.shapes && level.shapes.some(s =>
                            (s.conditions && s.conditions.some(g => g.some(c => MathEngine.usesVariable(c, 'a')))) ||
                            (s.condition && MathEngine.usesVariable(s.condition, 'a'))
                        ))
                    );

                    if (isAEnabled || usedInLevel) {
                        return (
                            <div className="absolute bottom-24 right-4 bg-gray-900/80 backdrop-blur border border-gray-700 p-4 rounded-xl shadow-lg flex flex-col gap-2 w-48 z-40">
                                <label className="text-neon-pink text-xs font-bold flex justify-between">
                                    <span>PARAMETER 'a'</span>
                                    <span>{gameState.a.toFixed(2)}</span>
                                </label>
                                <input
                                    type="range"
                                    min="-10" max="10" step="0.1"
                                    value={gameState.a}
                                    onChange={(e) => {
                                        setA(parseFloat(e.target.value));
                                    }}
                                    className="accent-neon-pink h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                                />
                            </div>
                        );
                    }
                    return null;
                })()}

                {/* Game Over / Clear Overlay */}
                {gameState.status === 'lost' && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-neon-surface border border-white/10 p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
                            <h2 className="text-4xl font-black mb-2 text-neon-pink">
                                GAME OVER
                            </h2>
                            <p className="text-gray-400 mb-8 font-mono">
                                Particle failed to reach the goal.
                            </p>

                            <div className="flex flex-col gap-3">
                                <button
                                    className="w-full py-3 bg-white/10 text-white font-bold rounded-lg hover:bg-white/20 transition-all flex items-center justify-center gap-2"
                                    onClick={() => { audioService.playSE('click'); stopGame(); }}
                                >
                                    <RefreshCw size={18} /> TRY AGAIN
                                </button>

                                <button
                                    className="w-full py-3 bg-transparent border border-white/10 text-gray-400 font-bold rounded-lg hover:text-white hover:border-white/30 transition-all flex items-center justify-center gap-2"
                                    onClick={() => { audioService.playSE('click'); navigate(backPath); }}
                                >
                                    <List size={18} /> BACK TO {listLabel}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <HelpDialog isOpen={showHelp} onClose={() => setShowHelp(false)} />

            <SolutionDisplayDialog
                isOpen={showSolutions}
                onClose={() => setShowSolutions(false)}
                levelId={level?.id || ''}
                levelSolution={level?.solution}
            />
        </div>
    );
};

const ZoomControls: React.FC<{ onZoomIn: () => void; onZoomOut: () => void }> = ({ onZoomIn, onZoomOut }) => {
    return (
        <div className="flex flex-col bg-gray-900 border border-gray-700 rounded-lg overflow-hidden shadow-lg shadow-neon-blue/10">
            <button onClick={onZoomIn} className="p-2 text-neon-blue hover:bg-gray-800 transition-colors">
                <Plus size={20} />
            </button>
            <div className="h-[1px] bg-gray-700" />
            <button onClick={onZoomOut} className="p-2 text-neon-blue hover:bg-gray-800 transition-colors">
                <Minus size={20} />
            </button>
        </div>
    );
};
