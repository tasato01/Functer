
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Detailed Derivative Test ---");
const cases = [
    "f'",
    "f^{\\prime}",
    "f^{\\prime}(X)",
    "f^{\\prime}\\left(X\\right)",
    "f+f^{\\prime}\\left(X\\right)"
];

cases.forEach(c => {
    console.log(`\nInput: ${c}`);
    // Use canonical: false as per current implementation
    console.log("JSON:", JSON.stringify(ce.parse(c, { canonical: false }).json, null, 2));
});
