
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Derivative Evaluation Test ---");
const cases = [
    "f'(X)",
    "f'(t)",
    "\\frac{d}{dx}f(X)", // Probably 0
    "\\left.\\frac{d}{dx}f(x)\\right|_{x=X}"
];

cases.forEach(c => {
    try {
        console.log(`\nLaTeX: ${c}`);
        console.log("JSON:", JSON.stringify(ce.parse(c).json, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
});
