
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Cortex Derivative Test ---");
const cases = [
    "f'",
    "f''",
    "\\frac{df}{dx}",
    "\\frac{d}{dx}f(x)",
    "\\frac{d}{dx} \\sin x",
    "\\partial f" // partial?
];

cases.forEach(c => {
    try {
        console.log(`\nLaTeX: ${c}`);
        console.log("JSON:", JSON.stringify(ce.parse(c).json, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
});
