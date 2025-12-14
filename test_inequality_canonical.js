
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Canonical Inequality Test ---");
const cases = [
    "4 < x",
    "x < 6",
    "4 < x < 6",
    "4 \\le x < 6"
];

cases.forEach(c => {
    console.log(`\nInput: ${c}`);
    try {
        const parsed = ce.parse(c, { canonical: true });
        console.log("JSON:", JSON.stringify(parsed.json, null, 2));
    } catch (e) {
        console.log("Error:", e.message);
    }
});
