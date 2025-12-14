
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

console.log("--- Cortex Call Test ---");
console.log("F(x) ->", JSON.stringify(ce.parse("F(x)").json));
console.log("f(x) ->", JSON.stringify(ce.parse("f(x)").json));
console.log("G(x) ->", JSON.stringify(ce.parse("G(x)").json));
