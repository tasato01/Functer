
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Cortex Test 3: Log Bases ---");
console.log("log_e x ->", JSON.stringify(ce.parse("\\log_e x").json));
console.log("log_2 x ->", JSON.stringify(ce.parse("\\log_2 x").json));
console.log("ln x ->", JSON.stringify(ce.parse("\\ln x").json));
console.log("log x ->", JSON.stringify(ce.parse("\\log x").json));
// Check if cleanExpression handles $$...$$
console.log("$$...$$ ->", JSON.stringify(ce.parse("$$ \\frac{1}{2} $$").json));
