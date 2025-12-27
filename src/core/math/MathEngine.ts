import { create, all } from 'mathjs';
import { ComputeEngine } from '@cortex-js/compute-engine';

const math = create(all);
const ce = new ComputeEngine();

// Add to mathjs
math.import({
    integral: () => NaN // Placeholder
}, { override: true });


export interface MathFunction {
    raw: string;
    mathJs?: string; // Transpiled MathJS code
    compiled: (scope: any) => any; // Return boolean or number
    code?: any; // MathJS compiled object for fast evaluation
    native?: Function; // Native JS function for extreme speed
    isValid: boolean;
    error?: string;
}

export class MathEngine {

    // Numerical Derivative (Central Difference)
    public static numericalDerivative(f: (x: number) => number, x: number, h: number = 0.001): number {
        return (f(x + h) - f(x - h)) / (2 * h);
    }

    // Numerical Integration (Simpson's 1/3 Rule)
    // N should be even.
    private static numericalIntegral(expr: string, variable: string, min: number, max: number, scope: any): number {
        const N = 20; // Resolution. Higher is slower but more accurate.
        const h = (max - min) / N;
        let sum = 0;

        let code;
        try {
            code = math.parse(expr).compile();
        } catch { return NaN; }

        const evalAt = (val: number) => {
            const newScope = { ...scope, [variable]: val };
            try { return code.evaluate(newScope); } catch { return 0; }
        };

        sum += evalAt(min);
        sum += evalAt(max);

        for (let i = 1; i < N; i++) {
            const x = min + i * h;
            if (i % 2 === 0) sum += 2 * evalAt(x);
            else sum += 4 * evalAt(x);
        }

        return (h / 3) * sum;
    }

    // Transform Cortex MathJSON to NATIVE JavaScript code (for raw speed)
    // Returns null if the expression cannot be safely converted to simple JS (e.g. contains integrals, complex types)
    private static mathJsonToNativeJs(json: any): string | null {
        if (typeof json === 'number') return json.toString();
        if (typeof json === 'string') {
            // Symbols
            if (json === 'Pi') return 'Math.PI';
            if (json === 'ExponentialE') return 'Math.E';
            return json;
        }
        if (!Array.isArray(json)) return null;

        const op = json[0];
        const args = json.slice(1);

        // Recursive helper
        const toJs = MathEngine.mathJsonToNativeJs;

        const argStrs = [];
        for (const arg of args) {
            const res = toJs(arg);
            if (res === null) return null; // Abort if any part is unsupported
            argStrs.push(res);
        }

        if (op === 'Add') return `(${argStrs.join(' + ')})`;
        if (op === 'Subtract') return `(${argStrs.join(' - ')})`;
        if (op === 'Multiply') return `(${argStrs.join(' * ')})`;
        if (op === 'Divide' || op === 'Rational') return `(${argStrs[0]} / ${argStrs[1]})`;
        if (op === 'Negate') return `(-${argStrs[0]})`;
        if (op === 'Power') return `Math.pow(${argStrs[0]}, ${argStrs[1]})`;

        // Logic
        if (op === 'And') return `(${argStrs.join(' && ')})`;
        if (op === 'Or') return `(${argStrs.join(' || ')})`;
        if (op === 'Not') return `!(${argStrs[0]})`;

        // Comparison
        const compOps: Record<string, string> = {
            'Equal': '===',
            'Less': '<',
            'Greater': '>',
            'LessEqual': '<=',
            'GreaterEqual': '>=',
            'NotEqual': '!=='
        };
        if (compOps[op]) {
            // Chain support
            if (argStrs.length > 2) {
                const terms: string[] = [];
                for (let i = 0; i < argStrs.length - 1; i++) {
                    terms.push(`(${argStrs[i]} ${compOps[op]} ${argStrs[i + 1]})`);
                }
                return `(${terms.join(' && ')})`;
            }
            return `(${argStrs[0]} ${compOps[op]} ${argStrs[1]})`;
        }

        // Standard Math
        const mathFuncs: Record<string, string> = {
            'Sin': 'Math.sin', 'Cos': 'Math.cos', 'Tan': 'Math.tan',
            'Abs': 'Math.abs', 'Sqrt': 'Math.sqrt',
            'Exp': 'Math.exp', 'Log': 'Math.log10', 'Ln': 'Math.log',
            'Ceil': 'Math.ceil', 'Floor': 'Math.floor', 'Round': 'Math.round',
            'Max': 'Math.max', 'Min': 'Math.min'
        };
        if (mathFuncs[op]) {
            return `${mathFuncs[op]}(${argStrs.join(', ')})`;
        }

        if (op === 'Log' && argStrs.length > 1) {
            return `(Math.log(${argStrs[0]}) / Math.log(${argStrs[1]}))`;
        }

        // InvisibleOperator
        if (op === 'InvisibleOperator') {
            return `(${argStrs[0]} * ${argStrs[1]})`;
        }

        // Generic Function Call (e.g. f(x))
        if (typeof op === 'string') {
            return `${op}(${argStrs.join(', ')})`;
        }

        return null; // Fallback to MathJS
    }

    // Preprocess expression to fix Cortex parsing issues with ASCII operators
    private static preprocess(expr: string): string {
        return expr
            .replace(/<=/g, '\\le ')
            .replace(/>=/g, '\\ge ')
            .replace(/!=/g, '\\neq ')
            .replace(/\blog10\b/g, '\\log_{10}') // log10 -> \log_{10}
            .replace(/\bln\b/g, '\\ln')          // ln -> \ln
            .replace(/\blog\b/g, '\\log');       // log -> \log
    }

    // Helper to unwrap Delimiter nodes
    private static unwrap(node: any): any {
        while (Array.isArray(node) && node[0] === 'Delimiter') {
            node = node[1];
        }
        return node;
    }

    // Transform Cortex MathJSON to MathJS expression string
    private static mathJsonToMathJs(json: any): string {
        if (typeof json === 'number') return json.toString();
        if (typeof json === 'string') {
            // Symbols
            if (json === 'Pi') return 'pi';
            if (json === 'ExponentialE') return 'e';
            return json; // Variable name
        }
        if (!Array.isArray(json)) return '';

        const op = json[0];
        const args = json.slice(1);

        if (op === 'Add') return `(${args.map(MathEngine.mathJsonToMathJs).join(' + ')})`;
        if (op === 'Subtract') return `(${args.map(MathEngine.mathJsonToMathJs).join(' - ')})`;
        if (op === 'Multiply') {
            // Implicit multiplication handled by join(' * ')
            return `(${args.map(MathEngine.mathJsonToMathJs).join(' * ')})`;
        }
        if (op === 'Divide') return `(${MathEngine.mathJsonToMathJs(args[0])}) / (${MathEngine.mathJsonToMathJs(args[1])})`;
        if (op === 'Rational') return `(${args[0]}) / (${args[1]})`;
        if (op === 'Power') return `(${MathEngine.mathJsonToMathJs(args[0])}) ^ (${MathEngine.mathJsonToMathJs(args[1])})`;
        if (op === 'Negate') return `-(${MathEngine.mathJsonToMathJs(args[0])})`;

        // Functions
        if (op === 'Sin') return `sin(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Cos') return `cos(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Tan') return `tan(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Sqrt') return `sqrt(${MathEngine.mathJsonToMathJs(args[0])})`;
        if (op === 'Abs') return `abs(${MathEngine.mathJsonToMathJs(args[0])})`;


        // Comparison Operators
        const compOps: Record<string, string> = {
            'Equal': '==',
            'Less': '<',
            'Greater': '>',
            'LessEqual': '<=',
            'GreaterEqual': '>=',
            'NotEqual': '!='
        };

        if (compOps[op]) {
            // Flatten nested logic from Cortex (e.g. 4 <= x < 6 -> ["LessEqual", 4, ["Less", x, 6]])
            // Unwrapping Delimiters is CRITICAL here to match structure.
            const arg0 = MathEngine.unwrap(args[0]);
            const arg1 = MathEngine.unwrap(args[1]);

            // Case 1: Right-Nested A Op (B Op C)
            if (args.length === 2 && Array.isArray(arg1)) {
                const innerOp = arg1[0];
                if (compOps[innerOp]) {
                    const A = MathEngine.mathJsonToMathJs(arg0);
                    const innerArgs = arg1.slice(1);
                    const B = MathEngine.mathJsonToMathJs(innerArgs[0]); // First arg of inner is shared
                    const innerExpr = MathEngine.mathJsonToMathJs(arg1);
                    return `(${A} ${compOps[op]} ${B}) and (${innerExpr})`;
                }
            }

            // Case 2: Left-Nested (A Op B) Op C
            // e.g. ["Less", ["LessEqual", 0, "y"], 3]
            if (args.length === 2 && Array.isArray(arg0)) {
                const innerOp = arg0[0];
                if (compOps[innerOp]) {
                    const innerExpr = MathEngine.mathJsonToMathJs(arg0);
                    const innerArgs = arg0.slice(1);
                    const B = MathEngine.mathJsonToMathJs(innerArgs[innerArgs.length - 1]); // Last arg of inner is shared
                    const C = MathEngine.mathJsonToMathJs(arg1);
                    return `(${innerExpr}) and (${B} ${compOps[op]} ${C})`;
                }
            }

            if (args.length > 2) {
                // Chain: a < b < c -> (a < b) and (b < c)
                const terms: string[] = [];
                for (let i = 0; i < args.length - 1; i++) {
                    terms.push(`(${MathEngine.mathJsonToMathJs(args[i])}) ${compOps[op]} (${MathEngine.mathJsonToMathJs(args[i + 1])})`);
                }
                return terms.join(' and ');
            }

            // Safety Check: If we STILL have a nested comparison that wasn't handled by Case 1 or Case 2, 
            // it means the structure is complex or unsupported.
            // Returning default comparison (e.g. 0 <= (y < 3)) evaluates to TRUE (0 <= 1) and turns screen RED.
            // We must block this.

            const isComp = (node: any) => {
                const unwrapped = MathEngine.unwrap(node);
                return Array.isArray(unwrapped) && compOps[unwrapped[0]];
            };

            if (isComp(arg0) || isComp(arg1)) {
                console.warn("Unsupported nested inequality structure, defaulting to false to prevent errors:", json);
                return 'false';
            }

            return `(${MathEngine.mathJsonToMathJs(args[0])}) ${compOps[op]} (${MathEngine.mathJsonToMathJs(args[1])})`;
        }

        // Exp function e^x
        if (op === 'Exp') return `exp(${MathEngine.mathJsonToMathJs(args[0])})`;

        // Derivatives
        // ["Prime", "f"] -> derivative of f.
        // We map this to a special function call 'derivative_f(x)'
        if (op === 'Prime') {
            const target = MathEngine.mathJsonToMathJs(args[0]);
            if (target === 'f') {
                return `derivative_f(x)`;
            }
            return `derivative_${target}(x)`; // Hope consistent naming
        }

        // Tuple handling: used for sequences or sometimes function calls like f'(x) -> (f', x)
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
            // Fallback: treat as list? MathJS doesn't support tuples well.
            // Return list [a, b, ...]
            return `[${args.map(MathEngine.mathJsonToMathJs).join(', ')}]`;
        }

        // Logs
        // ["Log", x] -> log10(x) (Common log)
        // ["Log", x, base] -> log(x, base)
        // ["Ln", x] -> log(x) (Natural log)
        if (op === 'Log') {
            const x = MathEngine.mathJsonToMathJs(args[0]);
            if (args.length > 1) {
                const base = MathEngine.mathJsonToMathJs(args[1]);
                return `log(${x}, ${base})`;
            }
            return `log10(${x})`; // Default Log to base 10
        }
        if (op === 'Ln') return `log(${MathEngine.mathJsonToMathJs(args[0])})`;

        // Integral ["Integrate", body, ["Limits", var, min, max]] OR ["Integrate", body, ["Tuple", var, min, max]]
        if (op === 'Integrate') {
            const bodyRaw = args[0];
            const limits = args[1];

            // Extract Body: If body is ["Function", expr, var], take expr
            let body = bodyRaw;
            if (Array.isArray(bodyRaw) && bodyRaw[0] === 'Function') {
                body = bodyRaw[1];
                // Check for ["Block", expr] pattern inside Function
                if (Array.isArray(body) && body[0] === 'Block') {
                    body = body[1];
                }
            }

            // Extract Limits
            let variable = 'x';
            let min = '0';
            let max = '1';

            // Cortex limits format can be ["Limits", var, min, max] or ["Tuple", var, min, max]
            if (Array.isArray(limits)) {
                variable = limits[1];
                min = MathEngine.mathJsonToMathJs(limits[2]);
                max = MathEngine.mathJsonToMathJs(limits[3]);
            }

            const bodyStr = MathEngine.mathJsonToMathJs(body);
            // Quote the body and variable for MathJS function call
            return `integral("${bodyStr.replace(/"/g, '\\"')}", "${variable}", ${min}, ${max})`;
        }


        // InvisibleOperator Handling (for canonical: false)
        // ["InvisibleOperator", a, b] -> a * b
        // ["InvisibleOperator", f, ["Delimiter", x]] -> f(x)
        // ["InvisibleOperator", ["Prime", f], ["Delimiter", x]] -> f'(x) -> derivative_f(x)
        if (op === 'InvisibleOperator') {
            // N-ary Implicit Multiplication (e.g. a b c -> a*b*c)
            if (args.length > 2) {
                return `(${args.map(MathEngine.mathJsonToMathJs).join(' * ')})`;
            }

            const left = args[0];
            const right = args[1]; // Can be ["Delimiter", ...]

            // Check if right is a Delimiter -> Function Call
            // ["Delimiter", content]
            if (Array.isArray(right) && right[0] === 'Delimiter') {
                // Special case for Prime: f'(x). 
                // Left is ["Prime", "f"]. Standard mathJsonToMathJs(["Prime", "f"]) returns "derivative_f(x)".
                // We want just "derivative_f" here to avoid "derivative_f(x)(x)".
                if (Array.isArray(left) && left[0] === 'Prime') {
                    const target = MathEngine.mathJsonToMathJs(left[1]); // "f"
                    const funcArgs = MathEngine.mathJsonToMathJs(right[1]);
                    return `derivative_${target}(${funcArgs})`;
                }

                const funcName = MathEngine.mathJsonToMathJs(left);
                const funcArgs = MathEngine.mathJsonToMathJs(right[1]); // Content of delimiter

                // Implicit Multiplication Fix: If funcName is a basic variable, treat as multiplication
                if (['x', 'y', 't', 'T', 'X', 'Y', 'a'].includes(funcName)) {
                    return `${funcName} * (${funcArgs})`;
                }

                return `${funcName}(${funcArgs})`;
            }

            // Otherwise -> Implicit Multiplication
            // Handle multiple args: ["InvisibleOperator", a, b, c] -> a * b * c
            return `(${args.map(MathEngine.mathJsonToMathJs).join(' * ')})`;
        }

        // Delimiter Handling
        // ["Delimiter", content] -> content
        if (op === 'Delimiter') {
            return MathEngine.mathJsonToMathJs(args[0]);
        }

        // Generic Function Call: ["f", x] -> f(x)
        if (typeof op === 'string') {
            // Implicit Multiplication Fix: If op is a basic variable, treat as multiplication
            if (['x', 'y', 't', 'T', 'X', 'Y', 'a'].includes(op)) {
                return `${op} * (${args.map(MathEngine.mathJsonToMathJs).join(' * ')})`;
            }
            return `${op}(${args.map(MathEngine.mathJsonToMathJs).join(', ')})`;
        }

        return '';
    }

    static cleanExpression(expr: string): string {
        try {
            // Use canonical: false to allow mixed types (f + f')
            const json = ce.parse(expr, { canonical: false }).json;
            return MathEngine.mathJsonToMathJs(json);
        } catch {
            return expr;
        }
    }

    static isStatic(expr: string): boolean {
        // Check if normalized string contains 't' or 'T' variable
        try {
            const normalized = MathEngine.cleanExpression(expr);
            // Use regex on normalized (mathjs) string
            // Check for t, T, X, Y as variables (Dynamic dependencies)
            return !/\b[tTXYa]\b/.test(normalized);
        } catch {
            return true;
        }
    }



    static compile(expression: string): MathFunction {
        if (!expression || !expression.trim()) {
            return {
                raw: expression || '',
                compiled: () => NaN,
                isValid: false,
                error: "Empty"
            };
        }
        try {
            // Preprocess to fix <= / >=
            const cleanedExpr = MathEngine.preprocess(expression);

            // 1. Parse LaTeX to MathJSON using Cortex (Non-Canonical)
            const boxed = ce.parse(cleanedExpr, { canonical: false });
            // Ignore valid check for now, some partial expressions work

            // 2. Convert MathJSON to MathJS string
            const mathJsExpr = MathEngine.mathJsonToMathJs(boxed.json);
            // console.log(`[Cortex] ${expression} -> ${mathJsExpr}`);

            // 3. Compile with MathJS
            const node = math.parse(mathJsExpr);
            const code = node.compile();

            // 4. Try Native Compilation
            let nativeFn: Function | undefined;
            try {
                const jsCode = MathEngine.mathJsonToNativeJs(boxed.json);
                if (jsCode) {
                    const body = `
                        const { x, y, X, Y, t, T, f, g, derivative_f, a } = scope;
                        const e = Math.E;
                        const pi = Math.PI;
                        return ${jsCode};
                    `;
                    nativeFn = new Function('scope', body);
                }
            } catch (e) {
                // Ignore native compilation errors
            }

            return {
                raw: expression,
                mathJs: mathJsExpr,
                code: code,
                native: nativeFn,
                compiled: (scope: any) => {
                    const extendedScope = {
                        ...scope,
                        integral: (exprStr: string, variable: string, min: number, max: number) => {
                            const innerScope = { ...scope };
                            if (scope.F) {
                                innerScope.f = scope.F;
                            }
                            return MathEngine.numericalIntegral(exprStr, variable, min, max, innerScope);
                        }
                    };
                    try { return code.evaluate(extendedScope); } catch (e) {
                        return NaN;
                    }
                },
                isValid: true
            };
        } catch (e: any) {
            console.error("[MathEngine] Compilation Error:", e);
            return {
                raw: expression,
                compiled: () => NaN,
                isValid: false,
                error: e.message
            };
        }
    }

    static evaluateChain(g: MathFunction, f: MathFunction, x: number, t: number = 0, y: number = 0, a: number = 0): number {
        try {
            // f(x) should NOT depend on t or T (unless allowed? usually f is player input). 
            // If explicit 'a' support is needed in 'f', allow it.
            const fScope = { x, a };
            const fx = f.compiled(fScope);

            // Function wrapper for f(x) to be used in g
            const F = (val: number) => {
                try { return f.compiled({ x: val, a }); } catch { return 0; }
            };

            // Numeric Derivative Wrapper
            const derivative_f = (val: number) => {
                return MathEngine.numericalDerivative(F, val);
            };

            const gScope = { f: fx, x, X: x, Y: y, t, T: t, F, derivative_f, a };
            const result = g.compiled(gScope);
            // Ensure result is a number (handle potential object returns from mathjs)
            const num = Number(result);
            return isFinite(num) ? num : NaN;
        } catch (e) {
            return NaN;
        }
    }

    static evaluateCondition(conditionRaw: string, scope: any): boolean {
        try {
            const cleaned = MathEngine.cleanExpression(conditionRaw);
            const res = math.evaluate(cleaned, scope);
            return !!res;
        } catch {
            return false;
        }
    }

    static compileCondition(conditionRaw: string): { evaluate: (scope: any) => boolean } {
        try {
            const cleaned = MathEngine.cleanExpression(conditionRaw);
            const code = math.parse(cleaned).compile();
            return {
                evaluate: (scope: any) => {
                    try { return !!code.evaluate(scope); } catch { return false; }
                }
            };
        } catch {
            return { evaluate: () => false };
        }
    }

    static getBoundaries(expression: string): { fn: MathFunction, type: 'solid' | 'dotted', axis: 'x' | 'y' }[] {
        const boundaries: { fn: MathFunction, type: 'solid' | 'dotted', axis: 'x' | 'y' }[] = [];
        try {
            // Preprocess to fix <= / >=
            const cleanedExpr = MathEngine.preprocess(expression);
            const json = ce.parse(cleanedExpr, { canonical: false }).json;
            // console.log("JSON:", JSON.stringify(json)); // Debug

            const extract = (node: any) => {
                if (!Array.isArray(node)) return;

                // UNWRAP Delimiters before processing
                node = MathEngine.unwrap(node);
                if (!Array.isArray(node)) return;

                const op = node[0];
                const args = node.slice(1);

                // Logical grouping
                if (op === 'And' || op === 'Or' || op === 'Not') {
                    args.forEach(extract);
                    return;
                }

                const compOps: Record<string, string> = {
                    'Equal': 'solid', 'LessEqual': 'solid', 'GreaterEqual': 'solid',
                    'Less': 'dotted', 'Greater': 'dotted', 'NotEqual': 'dotted'
                };

                if (compOps[op]) {
                    const style = compOps[op] as 'solid' | 'dotted';

                    // Helper to add boundary
                    const addBoundary = (a: any, b: any, overrideStyle?: 'solid' | 'dotted') => {
                        const s = overrideStyle || style;
                        const aStr = MathEngine.mathJsonToMathJs(a);
                        const bStr = MathEngine.mathJsonToMathJs(b);

                        if (aStr === 'y' && !bStr.includes('y')) {
                            boundaries.push({ fn: MathEngine.compile(bStr), type: s, axis: 'y' });
                        } else if (bStr === 'y' && !aStr.includes('y')) {
                            boundaries.push({ fn: MathEngine.compile(aStr), type: s, axis: 'y' });
                        }
                        else if (aStr === 'x' && !bStr.includes('x') && !bStr.includes('y')) {
                            boundaries.push({ fn: MathEngine.compile(bStr), type: s, axis: 'x' });
                        } else if (bStr === 'x' && !aStr.includes('x') && !aStr.includes('y')) {
                            boundaries.push({ fn: MathEngine.compile(aStr), type: s, axis: 'x' });
                        }
                    };

                    const arg0 = MathEngine.unwrap(args[0]);
                    const arg1 = MathEngine.unwrap(args[1]);

                    // Case 1: Right-nested: 0 <= (y < 3) -> 0 <= y AND y < 3
                    if (args.length === 2 && Array.isArray(arg1) && compOps[arg1[0]]) {
                        const A = args[0];
                        const innerArgs = arg1.slice(1);
                        const B = innerArgs[0]; // First arg of inner is shared
                        addBoundary(A, B, style); // Use CURRENT op style for first pair
                        extract(arg1); // Recurse for the rest (recursive extract uses unwrap)
                        return;
                    }

                    // Case 2: Left-nested: (0 <= y) < 3 -> y < 3 AND 0 <= y
                    if (args.length === 2 && Array.isArray(arg0) && compOps[arg0[0]]) {
                        const innerArgs = arg0.slice(1);
                        const B = innerArgs[innerArgs.length - 1]; // Last arg of inner is shared
                        const C = args[1];
                        addBoundary(B, C, style); // Use CURRENT op style for second pair
                        extract(arg0); // Recurse
                        return;
                    }

                    if (args.length === 2) {
                        addBoundary(args[0], args[1]);
                        extract(args[0]);
                        extract(args[1]);
                    } else if (args.length > 2) {
                        for (let i = 0; i < args.length - 1; i++) {
                            addBoundary(args[i], args[i + 1]);
                            extract(args[i]);
                        }
                        extract(args[args.length - 1]);
                    }
                }
            };

            extract(json);
        } catch (e) { console.error(e); }
        return boundaries;
    }

    static evaluateScalar(expr: string, scope: any): number {
        try {
            const cleaned = MathEngine.cleanExpression(expr);
            const res = math.evaluate(cleaned, scope);
            const num = Number(res);
            return isFinite(num) ? num : NaN;
        } catch {
            return NaN;
        }
    }
}
