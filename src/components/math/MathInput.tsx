import React, { useEffect, useRef } from 'react';
import 'mathlive';
import { MathfieldElement } from 'mathlive';



interface MathInputProps {
    value: string;
    onChange: (latex: string) => void;
    placeholder?: string;
    label?: string;
    disabled?: boolean;
    onEnter?: () => void;
}

// Configure MathLive to use CDN for fonts/sounds to avoid Vite dev server issues
// Using jsDelivr as unpkg had CORS issues
MathfieldElement.fontsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive/dist/fonts';
MathfieldElement.soundsDirectory = 'https://cdn.jsdelivr.net/npm/mathlive/dist/sounds';

export const MathInput: React.FC<MathInputProps> = ({ value, onChange, label, disabled, onEnter }) => {
    const mfRef = useRef<MathfieldElement>(null);

    // Sync value when it changes externally
    useEffect(() => {
        if (mfRef.current && mfRef.current.getValue() !== value) {
            mfRef.current.setValue(value);
        }
    }, [value]);

    useEffect(() => {
        const mf = mfRef.current;
        if (!mf) return;

        // Revert to standard virtual keyboard policy
        mf.mathVirtualKeyboardPolicy = "manual";

        // Prevent MathLive from scrolling the element into view on focus
        (mf as any).scrollIntoView = () => { };

        const handleInput = () => {
            onChange(mf.getValue());
        };

        if (mf) {
            (mf as any).onKeystroke = (element: any, keystroke: string, ev: KeyboardEvent) => {
                // Intercept ' (Shift+7 on JP Keyboard)
                if (keystroke === "'" || (ev.code === 'Digit7' && ev.shiftKey)) {
                    element.executeCommand(['insert', '^{\\prime}']);
                    return false; // Stop default handling
                }
                return true; // Continue default
            };
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (onEnter) onEnter();
            }
        };

        mf.addEventListener('input', handleInput);
        mf.addEventListener('keydown', onKeyDown);
        return () => {
            mf.removeEventListener('input', handleInput);
            mf.removeEventListener('keydown', onKeyDown);
        };
    }, [onChange]);

    // Use alias to bypass JSX intrinsic element check
    const MathFieldTag = 'math-field' as any;

    return (
        <div className="w-full">
            {label && <label className="block text-neon-blue text-sm font-bold mb-1">{label}</label>}
            <MathFieldTag
                ref={mfRef}
                disabled={disabled}
                className="w-full bg-black/50 border border-neon-blue/30 rounded p-2 text-white block"
                style={{
                    width: '100%',
                    backgroundColor: 'rgba(0,0,0,0.5)',
                    color: 'white',
                    border: '1px solid rgba(0, 243, 255, 0.3)',
                    borderRadius: '4px',
                    fontSize: '1.2em'
                }}
            >
                {value}
            </MathFieldTag>
        </div>
    );
};
