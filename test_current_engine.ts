
import { MathEngine } from './src/core/math/MathEngine';

console.log("--- MathEngine Execution Test ---");

const cases = [
    { expr: "f(x) + f'(x)", scope: { x: 1, f: (x) => x * x, derivative_f: (x) => 2 * x } },
    { expr: "4 < x < 6", scope: { x: 5 } },
    { expr: "4 < x < 6", scope: { x: 3 } },
    { expr: "4 <= x < 6", scope: { x: 4 } }, // Mixed chain
    { expr: "sin(x)", scope: { x: Math.PI / 2 } }
];

// Mock MathEngine.compile context if needed, but we can test cleanExpression or logic
// But MathEngine.compile returns a function that expects a specific scope.

// We need to bypass the 'f' injection logic in compile if we want to provide our own 'f' easily,
// OR we just define f in the scope passed to the compiled function.
// MathEngine.compile generates code that expects 'derivative_f' in scope if 'f'' is used.

for (const c of cases) {
    try {
        console.log(`\nExpr: "${c.expr}"`);
        const fn = MathEngine.compile(c.expr);
        if (!fn.isValid) {
            console.error("Compile Failed:", fn.error);
            continue;
        }

        // Prepare scope
        // derivative_f hack: MathEngine expects derivative_f in scope for f'
        const result = fn.compiled(c.scope);
        console.log(`Result (x=${c.scope.x}):`, result);
    } catch (e) {
        console.error("Execution Error:", e);
    }
}
