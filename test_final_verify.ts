
import { MathEngine } from './src/core/math/MathEngine';

console.log("--- Final Verification ---");

// Test x=2.
// f(x) = x^2 -> f(2) = 4
// f'(x) = 2x -> f'(2) = 4
// f(x) + f'(x) = 8

// f'(2) explicitly
const cases = [
    { expr: "f(x) + f'(x)", scope: { x: 2, f: (x) => x * x, derivative_f: (x) => 2 * x } },
    { expr: "f'(2)", scope: { derivative_f: (x) => 2 * x } }, // Should be 4
    { expr: "4 <= x < 6", scope: { x: 4 } }, // True
    { expr: "4 <= x < 6", scope: { x: 6 } }, // False
];

for (const c of cases) {
    try {
        console.log(`\nExpr: "${c.expr}"`);
        const fn = MathEngine.compile(c.expr);
        const result = fn.compiled(c.scope);
        console.log(`Result:`, result);
    } catch (e) {
        console.error("Exec Error:", e);
    }
}
