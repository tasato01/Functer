import 'mathlive';

export const setupMathLive = () => {
    if (!window.mathVirtualKeyboard) return;

    // @ts-ignore
    (window.mathVirtualKeyboard.layouts as any) = {
        "functer-layout": {
            label: "Functer",
            tooltip: "Functer Keyboard",
            layers: [{
                rows: [
                    [
                        { label: 'x', latex: 'x', class: 'tex' },
                        { label: 'y', latex: 'y', class: 'tex' },
                        { label: 't', latex: 't', class: 'tex' },
                        { label: 'f', latex: 'f', class: 'tex' },
                        { label: ' ', class: 'separator w5', width: 0.5 },
                        { label: '7', key: '7' },
                        { label: '8', key: '8' },
                        { label: '9', key: '9' },
                        { label: '/', latex: '\\div' },
                    ],
                    [
                        { label: 'sin', latex: '\\sin', class: 'small' },
                        { label: 'cos', latex: '\\cos', class: 'small' },
                        { label: 'tan', latex: '\\tan', class: 'small' },
                        { label: 'log', latex: '\\log', class: 'small' },
                        { label: ' ', class: 'separator w5', width: 0.5 },
                        { label: '4', key: '4' },
                        { label: '5', key: '5' },
                        { label: '6', key: '6' },
                        { label: '*', latex: '\\times' },
                    ],
                    [
                        { label: '<', latex: '<' },
                        { label: '>', latex: '>' },
                        { label: '≤', latex: '\\le' },
                        { label: '≥', latex: '\\ge' },
                        { label: ' ', class: 'separator w5', width: 0.5 },
                        { label: '1', key: '1' },
                        { label: '2', key: '2' },
                        { label: '3', key: '3' },
                        { label: '-', key: '-' },
                    ],
                    [
                        { label: '(', key: '(' },
                        { label: ')', key: ')' },
                        { label: '√', latex: '\\sqrt' },
                        { label: '^', latex: '^', shift: { latex: '^', label: '^' } },
                        { label: ' ', class: 'separator w5', width: 0.5 },
                        { label: '0', key: '0' },
                        { label: '.', key: '.' },
                        { label: '=', key: '=' },
                        { label: '+', key: '+' },
                    ],
                    [
                        { label: '[backspace]', command: ['performWithFeedback', 'deleteBackward'], width: 2 },
                        { label: ' ', class: 'separator w5', width: 0.5 },
                        { label: '[left]', command: ['performWithFeedback', 'moveToPreviousChar'] },
                        { label: '[right]', command: ['performWithFeedback', 'moveToNextChar'] },
                        { label: '[hide]', command: 'hideVirtualKeyboard', width: 1.5 }
                    ]
                ]
            }]
        }
    };
    // @ts-ignore
    window.mathVirtualKeyboard.currentLayout = "functer-layout";
};
