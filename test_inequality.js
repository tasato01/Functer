
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Inequality Test ---");
const cases = [
    "4 < x",
    "x < 6",
    "4 < x < 6",
    "4 < x <= 6",
    "4 \\le x < 6"
];

cases.forEach(c => {
    console.log(`\nInput: ${c}`);
    // Use canonical: false
    const parsed = ce.parse(c, { canonical: false });
    console.log("JSON:", JSON.stringify(parsed.json, null, 2));
});
