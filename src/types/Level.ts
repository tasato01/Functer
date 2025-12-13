// Points
export interface Point {
    x: number;
    y: number;
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
    difficulty: string; // 'A', 'B', 'C'...

    // Functions
    g_raw: string; // "g(f)(x)" definition (e.g. "sin(f) + x")

    // Entities
    startPoint: Point;
    startRadius: number; // Collision radius (def 0)
    goalPoint: Point;
    goalRadius: number;
    waypoints: Point[]; // Ordered checkpoints

    // Constraints
    constraints: string[]; // Legacy Inequality strings (e.g. "y > 5")
    shapes: (CircleConstraint | RectConstraint)[];

    // Physics
    playerSpeed: number;
}

export const DEFAULT_LEVEL: LevelConfig = {
    id: 'draft',
    name: 'New Stage',
    difficulty: 'A',
    g_raw: 'f',
    startPoint: { x: 0, y: 0 },
    startRadius: 0.1,
    goalPoint: { x: 10, y: 0 },
    goalRadius: 0.1,
    waypoints: [],
    constraints: [],
    shapes: [],
    playerSpeed: 5.0
};
