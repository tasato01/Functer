// Points
export interface Point {
    x: number;
    y: number;
}

export interface DynamicPoint extends Point {
    xFormula?: string; // e.g. "5 + sin(t)"
    yFormula?: string;
}

export interface Waypoint extends DynamicPoint {
    radius?: number; // Hit radius, default 0.1
}

// Constraints
export type ConstraintType = 'inequality' | 'circle' | 'rect';

export interface CircleConstraint {
    type: 'circle';
    id: string;
    center: Point;
    radius: number;
}

export interface RectConstraint {
    type: 'rect';
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

// Level Configuration
export interface LevelConfig {
    id: string;
    name: string;
    description?: string; // User memo
    difficulty: string; // 'A', 'B', 'C'...
    hint?: string; // Optional hint for players

    // Functions
    g_raw: string; // "g(f)(x)" definition (e.g. "sin(f) + x")

    // Entities
    startPoint: DynamicPoint;
    startRadius: number; // Collision radius (def 0)
    goalPoint: DynamicPoint;
    goalRadius: number;
    waypoints: Waypoint[]; // Ordered checkpoints

    // Constraints
    constraints: string[][]; // Groups (OR) of Conditions (AND)
    shapes: (CircleConstraint | RectConstraint)[];

    // Metadata
    authorId?: string;
    authorName?: string;
    isOfficial?: boolean;
    order?: number; // Official Level Order
    createdAt?: number;
    likes?: number;
    plays?: number;
    ratingTotal?: number; // Sum of all ratings
    ratingCount?: number; // Number of ratings (avg = total / count)

    // Physics
    playerSpeed: number;

    // Solution (LaTeX f(x))
    solution?: string; // Official solution string
}

export const DEFAULT_LEVEL: LevelConfig = {
    id: 'draft',
    name: '001: Sine Wave Intro',
    difficulty: 'A',
    description: 'Learn to use trigonometric functions.',
    hint: 'Try using the sin(x) function. Values between -1 and 1 might be safe.',
    g_raw: 'f',
    startPoint: { x: 0, y: 0 },
    startRadius: 0.5,
    goalPoint: { x: 10, y: 0 },
    goalRadius: 0.5,
    waypoints: [
        { x: 5, y: 2 }
    ],
    constraints: [
        ['y > 3'], // Ceiling
        ['y < -3'] // Floor
    ],
    shapes: [],
    playerSpeed: 5.0,
    likes: 0,
    plays: 0,
    ratingTotal: 0,
    ratingCount: 0
};

export const EMPTY_LEVEL: LevelConfig = {
    id: 'draft',
    name: 'Untitled Level',
    difficulty: 'A',
    description: '',
    hint: '',
    g_raw: 'f',
    startPoint: { x: 0, y: 0 },
    startRadius: 0,
    goalPoint: { x: 10, y: 0 },
    goalRadius: 0.1,
    waypoints: [],
    constraints: [],
    shapes: [],
    playerSpeed: 5.0,
    likes: 0,
    plays: 0,
    ratingTotal: 0,
    ratingCount: 0
};
