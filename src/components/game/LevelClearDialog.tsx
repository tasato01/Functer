import React from 'react';
import { Heart, Star, ArrowRight, Home, RefreshCw, Lightbulb } from 'lucide-react';
import { auth } from '../../services/firebase';

interface LevelClearDialogProps {
    onNext: () => void;
    onReplay: () => void;
    onHome: () => void;
    onLike: () => void;
    onRate: (rating: number) => void;
    onShowSolutions: () => void; // Added
    isLiked: boolean;
    userRating: number | null;
    hasNextLevel: boolean;
}

export const LevelClearDialog: React.FC<LevelClearDialogProps> = ({
    onNext,
    onReplay,
    onHome,
    onLike,
    onRate,
    isLiked,
    userRating,
    hasNextLevel,
    onShowSolutions
}) => {
    const isLoggedIn = !!auth.currentUser;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
            <div className="bg-gray-900 border border-neon-blue/50 rounded-2xl p-8 max-w-sm w-full text-center shadow-[0_0_50px_rgba(0,255,255,0.2)] relative overflow-y-auto max-h-[90vh]">
                {/* Background Effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-neon-blue/10 to-transparent pointer-events-none"></div>

                <h2 className="text-4xl font-bold italic text-white mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)] animate-pulse">
                    STAGE CLEAR!
                </h2>
                <div className="h-1 w-20 bg-neon-pink mx-auto mb-6 rounded-full shadow-[0_0_10px_#ff00ff]"></div>

                {isLoggedIn ? (
                    <div className="mb-8 space-y-4">
                        <div className="flex justify-center gap-4">
                            <button
                                onClick={onLike}
                                disabled={isLiked}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${isLiked ? 'bg-neon-pink/20 text-neon-pink cursor-default' : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'}`}
                            >
                                <Heart size={20} className={isLiked ? "fill-neon-pink" : ""} />
                                {isLiked ? "Liked!" : "Like"}
                            </button>
                        </div>

                        <div className="flex flex-col items-center gap-2">
                            <span className="text-sm text-gray-400">Rate this stage:</span>
                            <div className="flex gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        onClick={() => userRating === null && onRate(star)}
                                        disabled={userRating !== null}
                                        className={`transition-all hover:scale-110 ${userRating !== null && star <= userRating ? 'text-neon-yellow fill-neon-yellow' : 'text-gray-600 hover:text-neon-yellow'}`}
                                    >
                                        <Star size={24} className={userRating !== null && star <= userRating ? "fill-neon-yellow" : ""} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="mb-8 text-sm text-gray-500">
                        Login to rate stages!
                    </div>
                )}

                <div className="flex flex-col gap-3">
                    {hasNextLevel && (
                        <button
                            onClick={onNext}
                            className="w-full bg-white text-black font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            Next Stage <ArrowRight size={20} />
                        </button>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onReplay}
                            className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <RefreshCw size={18} /> Replay
                        </button>
                        <button
                            onClick={onHome}
                            className="flex-1 bg-gray-800 text-white py-3 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2"
                        >
                            <Home size={18} /> Menu
                        </button>
                    </div>

                    <button
                        onClick={onShowSolutions}
                        className="w-full mt-2 py-2 text-neon-purple hover:text-white hover:bg-neon-purple/20 rounded-lg text-sm font-bold transition-colors flex items-center justify-center gap-2 border border-neon-purple/30"
                    >
                        <Lightbulb size={16} /> Show Answers
                    </button>
                </div>
            </div>
        </div>
    );
};
