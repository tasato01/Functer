
// Mock imports since we can't run TS directly easily without setup
// I'll use a simplified version of the logic to test the parsing behavior if possible, 
// or just rely on the fact that I can run the actual TS file with ts-node if environment permits.
// Given the environment, I'll create a small TS test file and run it with `npx tsx`.

import { MathEngine } from './src/core/math/MathEngine';

const testCases = [
    'y > 3',
    'y < sin(x)',
    'x >= 5',
    '3 < y', // Implicit y > 3
    'y - 5 > 0', // Needs solving? Logic doesn't solve.
    'x^2 + y^2 < 10' // Should be empty?
];

testCases.forEach(expr => {
    console.log(`\nExpression: "${expr}"`);
    const boundaries = MathEngine.getBoundaries(expr);
    console.log(`Boundaries:`, boundaries.map(b => ({ axis: b.axis, type: b.type, fn: b.fn.mathJs })));
});
