import React, { useState } from 'react';
import { X, BookOpen, Calculator, PenTool, AlertTriangle } from 'lucide-react';
import { audioService } from '../../services/AudioService';

interface HelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({ isOpen, onClose }) => {
    const [activeTab, setActiveTab] = useState<'rules' | 'math' | 'editor'>('rules');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4 backdrop-blur-sm" onClick={onClose}>
            <div className="bg-gray-900 border border-neon-blue/50 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/10 shrink-0 bg-black/40">
                    <h2 className="text-xl font-bold text-neon-blue tracking-wider flex items-center gap-2">
                        <BookOpen size={24} /> MANUAL
                    </h2>
                    <button onClick={() => { audioService.playSE('click'); onClose(); }} className="text-gray-400 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-white/10 bg-black/20 shrink-0">
                    <button
                        onClick={() => { audioService.playSE('click'); setActiveTab('rules'); }}
                        className={`flex-1 py-3 font-bold text-sm tracking-widest transition-colors border-b-2 ${activeTab === 'rules' ? 'border-neon-green text-neon-green bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        RULES
                    </button>
                    <button
                        onClick={() => { audioService.playSE('click'); setActiveTab('math'); }}
                        className={`flex-1 py-3 font-bold text-sm tracking-widest transition-colors border-b-2 ${activeTab === 'math' ? 'border-neon-pink text-neon-pink bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        MATH
                    </button>
                    <button
                        onClick={() => { audioService.playSE('click'); setActiveTab('editor'); }}
                        className={`flex-1 py-3 font-bold text-sm tracking-widest transition-colors border-b-2 ${activeTab === 'editor' ? 'border-neon-blue text-neon-blue bg-white/5' : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        EDITOR
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1 min-h-0 overscroll-contain bg-[#0a0a0a]">
                    {activeTab === 'rules' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-neon-green rounded-full"></span>
                                    Objective
                                </h3>
                                <p className="text-gray-300 mb-4 leading-relaxed">
                                    Guide the <span className="text-neon-green font-bold">Player Particle</span> from the Start Point (S) to the Goal Point (G).
                                    To do this, you must input a mathematical function <code className="text-neon-pink bg-white/10 px-1 rounded">f(x)</code> that serves as the path.
                                </p>
                                <div className="bg-black/50 p-4 rounded-lg border border-white/10 text-sm grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neon-green/20 border border-neon-green/50 flex items-center justify-center text-neon-green font-bold">S</div>
                                        <div>
                                            <div className="font-bold text-white">Start Point</div>
                                            <div className="text-gray-500 text-xs">Must pass through here (t=0)</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neon-yellow/20 border border-neon-yellow/50 flex items-center justify-center text-neon-yellow font-bold">G</div>
                                        <div>
                                            <div className="font-bold text-white">Goal Point</div>
                                            <div className="text-gray-500 text-xs">Destination</div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            <section>
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-red-500 rounded-full"></span>
                                    Hazards & Constraints
                                </h3>
                                <ul className="space-y-3">
                                    <li className="bg-red-900/10 border border-red-500/20 p-3 rounded-lg flex gap-3">
                                        <AlertTriangle className="text-red-500 shrink-0" size={20} />
                                        <div>
                                            <div className="font-bold text-red-400">Forbidden Areas</div>
                                            <div className="text-gray-400 text-sm">Touching red zones results in immediate failure.</div>
                                        </div>
                                    </li>
                                    <li className="bg-cyan-900/10 border border-cyan-500/20 p-3 rounded-lg flex gap-3">
                                        <div className="w-5 h-5 rounded-full border-2 border-cyan-400 shrink-0"></div>
                                        <div>
                                            <div className="font-bold text-cyan-400">Waypoints</div>
                                            <div className="text-gray-400 text-sm">You must pass through ALL blue waypoints before reaching the Goal.</div>
                                        </div>
                                    </li>
                                </ul>
                            </section>
                        </div>
                    )}

                    {activeTab === 'math' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-neon-surface/50 p-4 rounded-lg border border-neon-pink/30 mb-6">
                                <h3 className="text-neon-pink font-bold flex items-center gap-2 mb-2">
                                    <Calculator size={18} /> Writing Functions
                                </h3>
                                <p className="text-sm text-gray-300">
                                    You can use standard math notation. The input is processed by a custom math engine supporting advanced features.
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">


                                <section>
                                    <h4 className="font-bold text-white mb-2 border-b border-white/10 pb-1">Constants</h4>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="font-mono text-neon-yellow">pi, π</dt>
                                            <dd className="text-gray-400">3.14159...</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="font-mono text-neon-yellow">e</dt>
                                            <dd className="text-gray-400">Euler's number</dd>
                                        </div>
                                    </dl>
                                </section>

                                <section>
                                    <h4 className="font-bold text-white mb-2 border-b border-white/10 pb-1">Functions</h4>
                                    <ul className="grid grid-cols-2 gap-2 text-sm font-mono text-neon-blue">
                                        <li>sin(x)</li>
                                        <li>cos(x)</li>
                                        <li>tan(x)</li>
                                        <li>abs(x)</li>
                                        <li>log(x)</li>
                                        <li>ln(x)</li>
                                        <li>sqrt(x)</li>
                                        <li>cbtr(x)</li>
                                    </ul>
                                </section>


                            </div>
                        </div>
                    )}

                    {activeTab === 'editor' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <section>
                                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                    <span className="w-1 h-6 bg-neon-blue rounded-full"></span>
                                    Creating Stages
                                </h3>
                                <p className="text-gray-300 text-sm mb-4">
                                    In Editor Mode, you define the world rules and place objects.
                                </p>
                            </section>

                            <div className="space-y-4">
                                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                    <h4 className="font-bold text-neon-blue mb-1">World Transformation: g(f)</h4>
                                    <p className="text-sm text-gray-400">
                                        This defines how the player's input <code className="text-neon-pink">f(x)</code> is distorted or transformed by the world.
                                        Default is <code className="text-green-400">f</code> (no change).
                                        Try <code className="text-green-400">f(x) + sin(x)</code> or <code className="text-green-400">f'(x)</code>!
                                    </p>
                                </div>

                                <div className="bg-white/5 p-3 rounded-lg border border-white/10">
                                    <h4 className="font-bold text-neon-blue mb-1">Publishing</h4>
                                    <p className="text-sm text-gray-400">
                                        To publish a level, you must <span className="text-white font-bold">Clear It Yourself</span> first.
                                        This proves the level is possible. Click 'Publish', then the system will ask you to perform a Verification Play.
                                    </p>
                                </div>
                            </div>

                            {/* Advanced Editor Features Moved Here */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10">
                                <section>
                                    <h4 className="font-bold text-white mb-2 border-b border-white/10 pb-1">Variables</h4>
                                    <dl className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <dt className="font-mono text-neon-yellow">x</dt>
                                            <dd className="text-gray-400">Current horizontal position</dd>
                                        </div>
                                        <div className="flex justify-between">
                                            <dt className="font-mono text-neon-yellow">t</dt>
                                            <dd className="text-gray-400">Time elapsed (seconds)</dd>
                                        </div>
                                    </dl>
                                </section>

                                <section>
                                    <h4 className="font-bold text-white mb-2 border-b border-white/10 pb-1">Advanced (World Function)</h4>
                                    <ul className="space-y-2 text-sm">
                                        <li className="flex flex-col">
                                            <code className="text-neon-pink">f'(X)</code>
                                            <span className="text-gray-500 text-xs">Derivative of player function at X</span>
                                        </li>
                                        <li className="flex flex-col">
                                            <code className="text-neon-pink">\int_&#123;0&#125;^&#123;X&#125; f(x) dx</code>
                                            <span className="text-gray-500 text-xs">Definite Integral (Latex notation)</span>
                                        </li>
                                    </ul>
                                </section>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
