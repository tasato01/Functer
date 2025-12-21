
import { create, all } from 'mathjs';
const math = create(all);
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

// Mock MathEngine subset (Same logic as actual file)
class MathEngine {
    static mathJsonToMathJs(json) {
        if (typeof json === 'number') return json.toString();
        if (typeof json === 'string') {
            if (json === 'Pi') return 'pi';
            return json;
        }
        if (!Array.isArray(json)) return '';

        const op = json[0];
        const args = json.slice(1);

        const compOps = {
            'Equal': '==', 'Less': '<', 'Greater': '>', 'LessEqual': '<=', 'GreaterEqual': '>=', 'NotEqual': '!='
        };

        if (compOps[op]) {
            // Case 1: Right-Nested
            if (args.length === 2 && Array.isArray(args[1])) {
                const innerOp = args[1][0];
                if (compOps[innerOp]) {
                    const A = MathEngine.mathJsonToMathJs(args[0]);
                    const innerArgs = args[1].slice(1);
                    const B = MathEngine.mathJsonToMathJs(innerArgs[0]);
                    const innerExpr = MathEngine.mathJsonToMathJs(args[1]);
                    return `(${A} ${compOps[op]} ${B}) and (${innerExpr})`;
                }
            }

            // Case 2: Left-Nested
            if (args.length === 2 && Array.isArray(args[0])) {
                const innerOp = args[0][0];
                if (compOps[innerOp]) {
                    const innerExpr = MathEngine.mathJsonToMathJs(args[0]);
                    const innerArgs = args[0].slice(1);
                    const B = MathEngine.mathJsonToMathJs(innerArgs[innerArgs.length - 1]);
                    const C = MathEngine.mathJsonToMathJs(args[1]);
                    return `(${innerExpr}) and (${B} ${compOps[op]} ${C})`;
                }
            }

            return `(${MathEngine.mathJsonToMathJs(args[0])}) ${compOps[op]} (${MathEngine.mathJsonToMathJs(args[1])})`;
        }

        if (op === 'Sin') return `sin(${MathEngine.mathJsonToMathJs(args[0])})`;

        return '';
    }
}

const inputs = ["0<=y<3"];

inputs.forEach(input => {
    try {
        const json = ce.parse(input, { canonical: false }).json;
        console.log(`Input: ${input}`);
        console.log(`JSON: ${JSON.stringify(json)}`);
        const mathJs = MathEngine.mathJsonToMathJs(json);
        console.log(`MathJS: ${mathJs}`);

        // Evaluate
        // y=2 (Should be true)
        const scopeTrue = { y: 2 };
        console.log(`Eval(y=2): ${math.evaluate(mathJs, scopeTrue)}`);

        // y=5 (Should be false)
        const scopeFalse = { y: 5 };
        console.log(`Eval(y=5): ${math.evaluate(mathJs, scopeFalse)}`);

        // y=-1 (Should be false)
        const scopeNeg = { y: -1 };
        console.log(`Eval(y=-1): ${math.evaluate(mathJs, scopeNeg)}`);

    } catch (e) {
        console.error(e);
    }
});
