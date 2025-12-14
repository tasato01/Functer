
import { create, all } from 'mathjs';
const math = create(all);

// MOCK MathEngine Static Methods (copied from current file)
class MathEngine {
    static cleanExpression(expr) {
        let s = expr;
        s = s.replaceAll('$$', '');
        s = s.replaceAll('$', '');
        s = s.replaceAll('\\left', '');
        s = s.replaceAll('\\right', '');
        s = s.replaceAll('\\differentialD', 'd');
        s = s.replaceAll('\\comma', ',');
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
        s = s.replaceAll('\\ln', 'log');
        s = s.replaceAll('\\le', '<=');
        s = s.replaceAll('\\leq', '<=');
        s = s.replaceAll('\\ge', '>=');
        s = s.replaceAll('\\geq', '>=');

        let prevS = '';
        while (s !== prevS) {
            prevS = s;
            s = s.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
        }

        s = s.replaceAll('\\mathrm{d}', 'd');
        s = s.replaceAll('\\limits', '');
        s = s.replaceAll('\\!', '');
        s = s.replaceAll('\\,', '');
        s = s.replaceAll('\\:', '');
        s = s.replaceAll('\\;', '');
        s = s.replaceAll('\\ ', ' ');
        s = s.replace(/\\mathrm\{([^{}]+)\}/g, '$1');

        s = s.replaceAll('{', '(').replaceAll('}', ')');
        s = s.replaceAll('\\', '');
        return s;
    }
}

const cases = [
    // Fraction cases
    { raw: '\\frac{1}{2}x', desc: '1/2 x (implicit)' },
    { raw: '\\frac{1}{2} x', desc: '1/2 x (implicit space)' },
    { raw: '\\frac{1}{2}\\times x', desc: '1/2 * x (explicit times)' },
    { raw: '\\frac{1}{2} * x', desc: '1/2 * x (explicit star)' },

    // Log cases
    { raw: '\\log x', desc: 'log x' },
    { raw: '\\log(x)', desc: 'log(x)' },
    { raw: '\\ln x', desc: 'ln x' },
    { raw: '\\ln(x)', desc: 'ln(x)' },
    { raw: '\\log_{10}(x)', desc: 'log10(x)' }
];

const scope = { x: 10 };

console.log("--- TEST START ---");
cases.forEach(c => {
    console.log(`\nCase: ${c.desc}`);
    console.log(`Raw: ${c.raw}`);
    const cleaned = MathEngine.cleanExpression(c.raw);
    console.log(`Cleaned: ${cleaned}`);
    try {
        const node = math.parse(cleaned);
        const res = node.evaluate(scope);
        console.log(`Result (x=10): ${res}`);
    } catch (e) {
        console.log(`ERROR: ${e.message}`);
    }
});
console.log("--- TEST END ---");
