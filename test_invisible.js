
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- InvisibleOperator Test ---");
const cases = ["2x", "f(x)", "f'(x)", "x y"];

cases.forEach(c => {
    console.log(`\nInput: ${c}`);
    console.log("JSON:", JSON.stringify(ce.parse(c, { canonical: false }).json, null, 2));
});
