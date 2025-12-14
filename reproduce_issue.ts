
import { MathEngine } from './src/core/math/MathEngine';

console.log("--- Reproduction Test: f + f'(X) Variations ---");

const cases = [
    "f + f'(X)",
    "f + f^{\\prime}(X)",
    "f + f^{\\prime}\\left(X\\right)",
    "$$ f+f^{\\prime}\\left(X\\right) $$"
];

// Mock scope resembling the game loop
const scope = {
    x: 2,
    X: 2,
    t: 0,
    f: 4,
    derivative_f: (val: number) => 2 * val,
    F: (val: number) => val * val
};

for (const expr of cases) {
    try {
        console.log(`\nInput: "${expr}"`);
        const fn = MathEngine.compile(expr);
        console.log("Compiled JS:", fn.mathJs);

        if (fn.isValid) {
            const res = fn.compiled(scope);
            console.log("Result:", res);
        } else {
            console.log("Invalid:", fn.error);
        }
    } catch (e: any) {
        console.error("Error:", e.message);
    }
}
