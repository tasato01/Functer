
import { MathEngine } from './src/core/math/MathEngine';
import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();

const samples = [
    '0 < y <= 1',
    'y > sin(x)',
    'y > x^2'
];

console.log("--- DEBUG START ---");

samples.forEach(expr => {
    console.log(`\nTesting: "${expr}"`);
    try {
        const json = ce.parse(expr, { canonical: false }).json;
        console.log("Cortex JSON:", JSON.stringify(json, null, 2));

        const boundaries = MathEngine.getBoundaries(expr);
        console.log("Boundaries Found:", boundaries.length);
        boundaries.forEach((b, i) => {
            console.log(`  [${i}] Axis: ${b.axis}, Type: ${b.type}, JS: ${b.fn.mathJs}`);
        });

        // Test Compile logic
        const func = MathEngine.compile(expr);
        console.log("Compiled Main JS:", func.mathJs);

        // Test Evaluation for Mixed Inequality
        if (expr === '0 < y <= 1') {
            console.log("Eval(y=0.5):", func.compiled({ y: 0.5, x: 0 }));
            console.log("Eval(y=2):", func.compiled({ y: 2, x: 0 }));
            console.log("Eval(y=-1):", func.compiled({ y: -1, x: 0 }));
        }

    } catch (e) {
        console.error("Error:", e);
    }
});
console.log("--- DEBUG END ---");
