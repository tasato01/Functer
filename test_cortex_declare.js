
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Cortex Declaration Test ---");

// Before declaration
console.log("Pre-declare f + f'(X):", JSON.stringify(ce.parse("f + f'(X)").json));

// Declare f as a function ?
// In Cortex, we can maybe assign it a type?
ce.declare("f", { type: "function" });
// Or define it?
// ce.assign("f", ["Function", ["Add", "x", 1], "x"]);

console.log("Post-declare f + f'(X):", JSON.stringify(ce.parse("f + f'(X)").json));

// Try explicitly helping parser?
// f' is Prime(f).
// If we say Prime(f) is a function?

console.log("Alone f'(X):", JSON.stringify(ce.parse("f'(X)").json));
