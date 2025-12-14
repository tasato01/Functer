import React, { useEffect, useRef } from 'react';
import 'mathlive';
import { MathfieldElement } from 'mathlive';



interface MathInputProps {
    value: string;
    onChange: (latex: string) => void;
    placeholder?: string;
    label?: string;
}

export const MathInput: React.FC<MathInputProps> = ({ value, onChange, label }) => {
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
        mf.mathVirtualKeyboardPolicy = "auto";

        const handleInput = () => {
            onChange(mf.getValue());
        };

        mf.setOptions({
            onKeystroke: (mf, keystroke, ev) => {
                // Intercept ' (Shift+7 on JP Keyboard)
                if (keystroke === "'" || (ev.code === 'Digit7' && ev.shiftKey)) {
                    mf.executeCommand(['insert', '^{\\prime}']);
                    return false; // Stop default handling
                }
                return true; // Continue default
            }
        });

        mf.addEventListener('input', handleInput);
        return () => {
            mf.removeEventListener('input', handleInput);
        };
    }, [onChange]);

    // Use alias to bypass JSX intrinsic element check
    const MathFieldTag = 'math-field' as any;

    return (
        <div className="w-full">
            {label && <label className="block text-neon-blue text-sm font-bold mb-1">{label}</label>}
            <MathFieldTag
                ref={mfRef}
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
