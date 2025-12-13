import { create, all } from 'mathjs';

const math = create(all);

export interface MathFunction {
    raw: string;
    compiled: (scope: any) => number;
    isValid: boolean;
    error?: string;
}

export class MathEngine {
    // Helper to sanitize LaTeX to MathJS-compatible string
    // MathLive outputs LaTeX, MathJS needs text-ish.
    // We need a robust parser or simple replacements.
    // For V5, simplifications:
    static cleanExpression(expr: string): string {
        let s = expr;

        // Remove LaTeX delimiters
        s = s.replaceAll('$$', '');
        s = s.replaceAll('$', '');

        // Remove sizing
        s = s.replaceAll('\\left', '');
        s = s.replaceAll('\\right', '');

        // Basic Replacements
        s = s.replaceAll('\\cdot', '*');
        s = s.replaceAll('\\times', '*');
        s = s.replaceAll('\\div', '/');
        s = s.replaceAll('\\pi', 'pi');
        s = s.replaceAll('\\theta', 'theta');
        s = s.replaceAll('\\sqrt', 'sqrt');
        s = s.replaceAll('\\sin', 'sin');
        s = s.replaceAll('\\cos', 'cos');
        s = s.replaceAll('\\tan', 'tan');
        s = s.replaceAll('\\log', 'log');
        s = s.replaceAll('\\ln', 'log'); // ln is log base e usually
        s = s.replaceAll('\\le', '<=');
        s = s.replaceAll('\\leq', '<=');
        s = s.replaceAll('\\ge', '>=');
        s = s.replaceAll('\\geq', '>=');
        s = s.replaceAll('\\frac', 'frac'); // Handle separately? MathJS doesn't support \frac{a}{b} directly in parse usually? 
        // Actually MathJS parse might fail on {}.
        // Simple regex for frac: \frac{a}{b} -> (a)/(b)
        // This is recursive/nesting heavy. mathjs has a latex parser? No, strictly strings.
        // For this prototype, we rely on MathInput (MathLive) possibly emitting "ASCII Math" or we do basic cleanup.
        // MathLive's .value usually gives LaTeX.
        // We will assume the user inputs reasonably simple things or use a library if needed.
        // Let's add basic frac support:
        s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, '($1)/($2)');

        // Remove other backslashes
        s = s.replaceAll('{', '(').replaceAll('}', ')'); // Dangerous but often works for simple groups
        s = s.replaceAll('\\', ''); // clear remaining commands
        return s;
    }

    static compile(expression: string): MathFunction {
        try {
            if (!expression || !expression.trim()) throw new Error("Empty");

            const cleaned = MathEngine.cleanExpression(expression);
            const node = math.parse(cleaned);
            const code = node.compile();

            return {
                raw: expression,
                compiled: (scope: any) => {
                    try { return code.evaluate(scope); } catch { return NaN; }
                },
                isValid: true
            };
        } catch (e: any) {
            return {
                raw: expression,
                compiled: () => NaN,
                isValid: false,
                error: e.message
            };
        }
    }

    static evaluateChain(g: MathFunction, f: MathFunction, x: number, t: number = 0): number {
        try {
            // User Req: t -> T, X, e, pi in scope.
            // x is the graph variable.
            // f(x) Scope
            const fScope = { x, T: t, e: Math.E, pi: Math.PI };
            const fx = f.compiled(fScope);

            // g(f) Scope
            // g can use f, x, X (player pos? No, simple evaluation X=x here), T
            const gScope = { f: fx, x, X: x, T: t, e: Math.E, pi: Math.PI };
            return g.compiled(gScope);
        } catch (e) {
            return NaN;
        }
    }

    static evaluateCondition(conditionRaw: string, scope: any): boolean {
        try {
            // Scope usually contains: x, y, X, Y(deprecated), T
            // Constraint: "y > x"
            const cleaned = MathEngine.cleanExpression(conditionRaw);
            // Auto-infer comparison?
            // If no comparison operator, assume it's boolean?
            // math.evaluate("y > x", scope) returns boolean.
            const res = math.evaluate(cleaned, scope);
            return !!res;
        } catch {
            return false;
        }
    }
}
