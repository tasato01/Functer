
import { create, all } from 'mathjs';
import { ComputeEngine } from '@cortex-js/compute-engine';

const math = create(all);
const ce = new ComputeEngine();

// Mock MathEngine logic
class MathEngine {
    static mathJsonToMathJs(json) {
        if (typeof json === 'number') return json.toString();
        if (typeof json === 'string') {
            if (json === 'Pi') return 'pi';
            if (json === 'ExponentialE') return 'e';
            return json;
        }
        if (!Array.isArray(json)) return '';

        const op = json[0];
        const args = json.slice(1);

        if (op === 'Add') return `(${args.map(MathEngine.mathJsonToMathJs).join(' + ')})`;
        if (op === 'Subtract') return `(${args.map(MathEngine.mathJsonToMathJs).join(' - ')})`;
        if (op === 'Multiply') {
            return `(${args.map(MathEngine.mathJsonToMathJs).join(' * ')})`;
        }
        if (op === 'Divide') return `(${MathEngine.mathJsonToMathJs(args[0])}) / (${MathEngine.mathJsonToMathJs(args[1])})`;
        if (op === 'Rational') return `(${args[0]}) / (${args[1]})`;
        if (op === 'Power') return `(${MathEngine.mathJsonToMathJs(args[0])}) ^ (${MathEngine.mathJsonToMathJs(args[1])})`;
        if (op === 'Negate') return `-(${MathEngine.mathJsonToMathJs(args[0])})`;

        // Derivatives
        if (op === 'Prime') {
            const target = MathEngine.mathJsonToMathJs(args[0]);
            if (target === 'f') {
                return `derivative_f(x)`;
            }
            return `derivative_${target}(x)`;
        }

        // Tuple handling
        if (op === 'Tuple') {
            // Check for f'(arg) pattern: ["Tuple", ["Prime", "f"], arg]
            const first = args[0];
            if (Array.isArray(first) && first[0] === 'Prime') {
                const target = MathEngine.mathJsonToMathJs(first[1]); // "f"
                if (args.length > 1) {
                    const arg = MathEngine.mathJsonToMathJs(args[1]);
                    return `derivative_${target}(${arg})`;
                }
            }
            return `[${args.map(MathEngine.mathJsonToMathJs).join(', ')}]`;
        }

        // Functions
        if (op === 'Sin') return `sin(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Cos') return `cos(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Tan') return `tan(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Sqrt') return `sqrt(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Abs') return `abs(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Exp') return `exp(${MathEngine.mathJsonToMathJs(args[0])})`;

        if (op === 'Log') {
            const x = MathEngine.mathJsonToMathJs(args[0]);
            if (args.length > 1) {
                const base = MathEngine.mathJsonToMathJs(args[1]);
                return `log(${x}, ${base})`;
            }
            return `log10(${x})`;
        }
        if (op === 'Ln') return `log(${MathEngine.mathJsonToMathJs(args[0])})`;

        if (op === 'Integrate') {
            return "integral_mock"; // Simplify for this test
        }

        if (typeof op === 'string') {
            return `${op}(${args.map(MathEngine.mathJsonToMathJs).join(', ')})`;
        }
        return '';
    }

    static cleanExpression(expr) {
        try {
            const json = ce.parse(expr).json;
            return MathEngine.mathJsonToMathJs(json);
        } catch {
            return expr;
        }
    }
}

// Test Case
const input = "f + f'(X)";
console.log(`Input: ${input}`);

// 1. Cortex Parse
const boxed = ce.parse(input);
console.log("Cortex JSON:", JSON.stringify(boxed.json, null, 2));

// 2. Convert to MathJS
const mathJsExpr = MathEngine.mathJsonToMathJs(boxed.json);
console.log("MathJS Expr:", mathJsExpr);

// 3. Evaluate (Mock Scope)
try {
    const node = math.parse(mathJsExpr);
    const code = node.compile();

    // Mock Scope
    const scope = {
        f: 10,
        derivative_f: (val) => val * 2, // Dummy derivative: 2x
        X: 5
    };

    const res = code.evaluate(scope);
    console.log(`Result (f=10, X=5, f'(x)=2x -> f'(5)=10): ${res}`); // Should be 10 + 10 = 20
} catch (e) {
    console.log("Evaluation Error:", e.message);
}
