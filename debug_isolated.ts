
import fs from 'fs';
import { MathEngine } from './src/core/math/MathEngine';
import { ComputeEngine } from '@cortex-js/compute-engine';

const ce = new ComputeEngine();
const expr = '0 < y <= 1';

console.log(`\nTesting: "${expr}"`);
try {
    const json = ce.parse(expr, { canonical: false }).json;
    fs.writeFileSync('debug.json', JSON.stringify(json, null, 2));
    console.log("Written to debug.json");

    const func = MathEngine.compile(expr);
    console.log("Compiled MathJS:", func.mathJs);

    const expr2 = '0 < y \\le 1';
    console.log(`\nTesting: "${expr2}"`);
    const json2 = ce.parse(expr2, { canonical: false }).json;
    console.log("Cortex JSON (Corrected):", JSON.stringify(json2, null, 2));
    const func2 = MathEngine.compile(expr2);
    console.log("Compiled MathJS (Corrected):", func2.mathJs);

} catch (e) {
    console.error("Error:", e);
}
