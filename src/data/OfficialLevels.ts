import { DEFAULT_LEVEL } from '../types/Level';
import type { LevelConfig } from '../types/Level';

export const OFFICIAL_LEVELS: LevelConfig[] = [
    {
        ...DEFAULT_LEVEL,
        id: 'official_001',
        name: 'The Variable Gap',
        difficulty: '4',
        description: 'Use the variable "a" to change gravity and jump across the wide gap.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 1,
        // Start and Goal
        startPoint: { x: -8, y: 0 },
        goalPoint: { x: 8, y: 0 },
        goalRadius: 0.5,
        // Rules: g depends on a
        g_raw: '10 + a', // Base gravity 10, modifiable by a
        // Player Variable a
        playerVar: {
            enabled: true,
            min: -5,
            max: 20,
            current: 0,
            speed: 5
        },
        // Constraints
        constraints: [
            // Floor with gap
            [
                'y < -1',
                'x < -2 or x > 2' // Gap between -2 and 2
            ]
        ],
        hint: 'Increase "a" to make gravity stronger? No, wait... to make gravity weaker for higher jumps? Or maybe stronger gravity makes you fall faster... Try different values!'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_002',
        name: 'Variable Obstacle',
        difficulty: '4',
        description: 'Phase shift your way through the wall.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 2,
        startPoint: { x: -8, y: 0 },
        goalPoint: { x: 8, y: 0 },
        g_raw: '0', // Zero gravity
        playerVar: {
            enabled: true,
            min: 0,
            max: 10,
            current: 0,
            speed: 5
        },
        constraints: [
            // Wall at x=0 with a hole that moves based on 'a'
            // Wall logic: x is near 0 AND y is NOT near the hole
            // Hole at y = sin(a)
            ['x > -0.5', 'x < 0.5', 'abs(y - sin(a)) > 1.5']
        ],
        hint: 'f(x) = sin(x) might collide. Try shifting the phase or just move straight and adjust "a" to align the hole.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_003',
        name: 'The Shutter',
        difficulty: '4',
        description: 'Open the gate.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 3,
        startPoint: { x: -8, y: 5 },
        goalPoint: { x: 8, y: 5 },
        g_raw: '10',
        playerVar: {
            enabled: true,
            min: 0,
            max: 10,
            current: 0,
            speed: 5
        },
        shapes: [
            // Shutter wall
            {
                id: 'shutter_1',
                type: 'rect',
                x: -1, y: 0, width: 2, height: 10,
                color: 'red',
                condition: 'a <= 5' // Closed if a <= 5
            }
        ],
        constraints: [
            ['y < 0'] // Floor
        ],
        hint: 'Set a > 5 to open the shutter.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_004',
        name: 'Switch Bridge',
        difficulty: '5',
        description: 'The bridge only exists when you are in position.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 4,
        startPoint: { x: -8, y: 2 },
        goalPoint: { x: 8, y: 2 },
        g_raw: '10',
        constraints: [
            ['y < 0'], // Main floor
            ['y < -5', 'x > -2', 'x < 2'] // Pit in the middle
        ],
        shapes: [
            // Conditional Bridge
            {
                id: 'bridge',
                type: 'rect',
                x: -3, y: 1, width: 6, height: 1,
                color: 'blue',
                condition: 'x > -4 and x < 4' // Only exists when player is near center
            }
        ],
        hint: 'The bridge appears when you approach it. Don\'t move too fast or it might disappear!'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_005',
        name: 'Interval Jump',
        difficulty: '4',
        description: 'Gravity flips.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 5,
        startPoint: { x: -8, y: 0 },
        goalPoint: { x: 8, y: 0 },
        g_raw: '10', // Default
        gRules: [
            { condition: 'x > -2 and x < 2', expression: '-5' } // Antigravity in middle
        ],
        constraints: [
            ['y < -2'], // Floor
            ['y > 5']   // Ceiling
        ],
        hint: 'Use the center zone to gain height.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_006',
        name: 'Antigravity Elevator',
        difficulty: '5',
        description: 'Going up?',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 6,
        startPoint: { x: -5, y: -8 },
        goalPoint: { x: 5, y: 8 },
        g_raw: '10',
        playerVar: {
            enabled: true,
            min: -20,
            max: 20,
            current: 0,
            speed: 5
        },
        gRules: [
            // Elevator shaft: gravity depends on 'a'
            { condition: 'x > -2 and x < 2', expression: '-a' }
        ],
        constraints: [
            ['x < -2', 'y < 10'], // Left wall
            ['x > 2', 'y < 10'],  // Right wall
            ['y < -9'] // Floor
        ],
        hint: 'Set "a" to a positive value to create updraft in the shaft.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_007',
        name: 'Phase Shift',
        difficulty: '5',
        description: 'Oscillate "a" to pass through alternating barriers.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 7,
        startPoint: { x: -9, y: 0 },
        goalPoint: { x: 9, y: 0 },
        g_raw: '0',
        playerVar: {
            enabled: true,
            min: 0,
            max: 10,
            current: 0,
            speed: 5
        },
        shapes: [
            { id: 'b1', type: 'rect', x: -6, y: -5, width: 1, height: 10, color: 'red', condition: 'sin(a) > 0' },
            { id: 'b2', type: 'rect', x: -3, y: -5, width: 1, height: 10, color: 'red', condition: 'sin(a) < 0' },
            { id: 'b3', type: 'rect', x: 0, y: -5, width: 1, height: 10, color: 'red', condition: 'sin(a) > 0' },
            { id: 'b4', type: 'rect', x: 3, y: -5, width: 1, height: 10, color: 'red', condition: 'sin(a) < 0' },
            { id: 'b5', type: 'rect', x: 6, y: -5, width: 1, height: 10, color: 'red', condition: 'sin(a) > 0' },
        ],
        hint: 'Keep changing "a" back and forth.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_008',
        name: 'Binary Choice',
        difficulty: '4',
        description: 'Choose your path wisely.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 8,
        startPoint: { x: -8, y: 0 },
        goalPoint: { x: 8, y: 0 },
        g_raw: '10',
        playerVar: {
            enabled: true,
            min: -1,
            max: 1,
            current: 1, // Default to 1
            speed: 5
        },
        constraints: [
            ['y < 0', 'x < -2'], // Start floor
            ['y < 0', 'x > 2'],  // Goal floor
            ['x > -2', 'x < 2', 'y > 2', 'y < 4'], // Middle Obstacle
        ],
        gRules: [
            { condition: 'a > 0', expression: '20' }, // High gravity (hard to jump over)
            { condition: 'a < 0', expression: '2' }   // Low gravity (easy to jump over)
        ],
        hint: 'If a > 0, gravity is heavy. If a < 0, gravity is light.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_009',
        name: 'The Clock',
        difficulty: '5',
        description: 'Timing is everything.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 9,
        startPoint: { x: -8, y: 0 },
        goalPoint: { x: 8, y: 0 },
        g_raw: '5',
        shapes: [
            // Rotating wall active based on time 't'
            { id: 'clock_1', type: 'rect', x: -2, y: -5, width: 1, height: 10, color: 'red', condition: 'sin(t) > 0' },
            { id: 'clock_2', type: 'rect', x: 2, y: -5, width: 1, height: 10, color: 'red', condition: 'cos(t) > 0' }
        ],
        constraints: [['y < -2']],
        hint: 'Watch the cycle (t) and move when the way is clear.'
    },
    {
        ...DEFAULT_LEVEL,
        id: 'official_010',
        name: 'Grandmaster',
        difficulty: '5+',
        description: 'Combine all your skills.',
        authorName: 'Functer Team',
        isOfficial: true,
        order: 10,
        startPoint: { x: -9, y: 0 },
        goalPoint: { x: 9, y: 0 },
        g_raw: '10',
        playerVar: {
            enabled: true,
            min: 0,
            max: 10,
            current: 0,
            speed: 5
        },
        // Piecewise Gravity
        gRules: [
            { condition: 'x < -3', expression: '10 + a' }, // Start: standard but adjustable
            { condition: 'x >= -3 and x < 3', expression: '-2' }, // Middle: Antigravity
            { condition: 'x >= 3', expression: '20' } // End: Super Heavy
        ],
        // Conditional Shapes
        shapes: [
            { id: 'gm_wall', type: 'rect', x: 0, y: 5, width: 1, height: 10, color: 'purple', condition: 'a < 5' }
        ],
        constraints: [
            ['y < -5'], // Floor
        ],
        hint: 'Adjust "a" for the start, ride the antigravity, open the gate (a>=5), and survive the heavy gravity at the end.'
    }
];
