import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Mail, Lock, User as UserIcon } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../../services/firebase';

interface AuthDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AuthDialog: React.FC<AuthDialogProps> = ({ isOpen, onClose }) => {
    const [mode, setMode] = useState<'login' | 'signup'>('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (mode === 'signup') {
                await signUpWithEmail(email, password);
                alert("Account created successfully!");
                onClose();
            } else {
                await signInWithEmail(email, password);
                onClose();
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            setError('');
            await signInWithGoogle();
            onClose();
        } catch (err: any) {
            setError(err.message || "Google login failed");
        }
    };

    return createPortal(
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="bg-gray-900 border border-gray-700 rounded-lg p-6 w-full max-w-sm relative" onClick={e => e.stopPropagation()}>
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20} /></button>

                <h2 className="text-xl font-bold text-white mb-6 text-center">
                    {mode === 'login' ? 'Login' : 'Create Account'}
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold block">Email</label>
                        <div className="relative">
                            <Mail size={16} className="absolute left-3 top-2.5 text-gray-500" />
                            <input
                                type="email"
                                className="w-full bg-black/50 border border-gray-600 rounded p-2 pl-9 text-white focus:border-neon-blue outline-none"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="text-xs text-gray-400 font-bold block">Password</label>
                        <div className="relative">
                            <Lock size={16} className="absolute left-3 top-2.5 text-gray-500" />
                            <input
                                type="password"
                                className="w-full bg-black/50 border border-gray-600 rounded p-2 pl-9 text-white focus:border-neon-blue outline-none"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                required
                                minLength={6}
                            />
                        </div>
                    </div>

                    {error && <p className="text-red-400 text-xs">{error}</p>}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2 bg-neon-blue text-black font-bold rounded hover:bg-white transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Processing...' : (mode === 'login' ? 'Login' : 'Sign Up')}
                    </button>
                </form>

                <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-700"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-gray-900 px-2 text-gray-500">Or continue with</span></div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    className="w-full py-2 bg-white text-black font-bold rounded hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                    <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="G" />
                    Google
                </button>

                <div className="mt-4 text-center text-xs text-gray-400">
                    {mode === 'login' ? (
                        <>Don't have an account? <button onClick={() => setMode('signup')} className="text-neon-blue hover:underline">Sign up</button></>
                    ) : (
                        <>Already have an account? <button onClick={() => setMode('login')} className="text-neon-blue hover:underline">Login</button></>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};
