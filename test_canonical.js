
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Non-Canonical Test ---");
const input = "f + f'(X)";

// Canonical (Default)
console.log("Canonical:", JSON.stringify(ce.parse(input).json, null, 2));

// Non-Canonical
console.log("Non-Canonical:", JSON.stringify(ce.parse(input, { canonical: false }).json, null, 2));
