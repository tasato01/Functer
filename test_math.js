
const { create, all } = require('mathjs');
const math = create(all);

const exprs = [
    '1/2(sin(x))',
    '1/2x',
    '1/2*x',
    '(1/2)(sin(x))',
    '1/2sin(x)'
];

exprs.forEach(e => {
    try {
        const node = math.parse(e);
        console.log(`"${e}" -> ${node.toString()} (Compiled: ${node.compile().evaluate({ x: Math.PI / 2 })})`);
    } catch (err) {
        console.log(`"${e}" -> Error: ${err.message}`);
    }
});
