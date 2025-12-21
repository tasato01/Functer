
import { create, all } from 'mathjs';
const math = create(all);
import { ComputeEngine } from '@cortex-js/compute-engine';
const ce = new ComputeEngine();

// Mock MathEngine subset (Same logic as actual file)
class MathEngine {
    static compile(expr) { return { compiled: (scope) => math.evaluate(expr, scope) }; }
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
        return '';
    }

    static getBoundaries(expression) {
        const boundaries = [];
        try {
            const json = ce.parse(expression, { canonical: false }).json;
            console.log('JSON:', JSON.stringify(json));

            const extract = (node) => {
                if (!Array.isArray(node)) return;
                const op = node[0];
                const args = node.slice(1);

                if (op === 'And' || op === 'Or' || op === 'Not') {
                    args.forEach(extract);
                    return;
                }

                const compOps = {
                    'Equal': 'solid', 'LessEqual': 'solid', 'GreaterEqual': 'solid',
                    'Less': 'dotted', 'Greater': 'dotted', 'NotEqual': 'dotted'
                };

                if (compOps[op]) {
                    const style = compOps[op];

                    const processPair = (a, b) => {
                        const aStr = MathEngine.mathJsonToMathJs(a);
                        const bStr = MathEngine.mathJsonToMathJs(b);
                        console.log(`Pair: ${aStr} vs ${bStr}`);

                        if (aStr === 'y' && !bStr.includes('y')) {
                            boundaries.push({ fn: bStr, type: style, axis: 'y' });
                        } else if (bStr === 'y' && !aStr.includes('y')) {
                            boundaries.push({ fn: aStr, type: style, axis: 'y' });
                        }
                        else if (aStr === 'x' && !bStr.includes('x') && !bStr.includes('y')) {
                            boundaries.push({ fn: bStr, type: style, axis: 'x' });
                        } else if (bStr === 'x' && !aStr.includes('x') && !aStr.includes('y')) {
                            boundaries.push({ fn: aStr, type: style, axis: 'x' });
                        }

                        extract(a);
                        extract(b);
                    };

                    if (args.length === 2) {
                        processPair(args[0], args[1]);
                    } else if (args.length > 2) {
                        for (let i = 0; i < args.length - 1; i++) {
                            processPair(args[i], args[i + 1]);
                        }
                    }
                }
            };

            extract(json);
        } catch (e) { console.error(e); }
        return boundaries;
    }
}

const inputs = ["0<=y<3"];

inputs.forEach(input => {
    console.log(`Input: ${input}`);
    const b = MathEngine.getBoundaries(input);
    console.log(`Boundaries:`, b);
});
