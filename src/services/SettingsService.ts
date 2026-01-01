export class SettingsService {
    private static MOVE_SPEED_KEY = 'functer_move_speed';
    private static DEFAULT_SPEED = 10;

    static getMoveSpeed(): number {
        const saved = localStorage.getItem(this.MOVE_SPEED_KEY);
        if (saved === null) return this.DEFAULT_SPEED;

        const parsed = parseFloat(saved);
        return isNaN(parsed) ? this.DEFAULT_SPEED : parsed;
    }

    static setMoveSpeed(speed: number) {
        // Clamp between 1 and 50
        const clamped = Math.max(1, Math.min(50, speed));
        localStorage.setItem(this.MOVE_SPEED_KEY, clamped.toString());
    }
}
