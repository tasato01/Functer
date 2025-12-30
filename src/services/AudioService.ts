// Native Audio Service
class AudioService {
    private bgm: HTMLAudioElement | null = null;
    private currentBgmName: string | null = null;
    private seCache: Map<string, HTMLAudioElement> = new Map();
    private bgmVolume = 0.1;
    private seVolume = 0.8;

    // Assuming the user intended to define a static or private member for SE sources
    // This block is added based on the user's "Code Edit" snippet,
    // making it a private member for syntactic correctness.
    // private _SESources = {
    //     checkpoint: 'sounds/se_checkpoint.mp3',
    //     clear: 'sounds/se_fanfare.mp3',
    //     gameover: 'sounds/se_gameover.mp3',
    //     save: 'sounds/se_save.mp3', // Placeholder
    //     play: 'sounds/se_play.mp3', // Placeholder
    //     se_area: 'sounds/se_area.mp3',
    // };

    constructor() {
        // Load settings from localStorage
        const savedBGM = localStorage.getItem('bgmVolume');
        const savedSE = localStorage.getItem('seVolume');

        if (savedBGM !== null) this.bgmVolume = parseFloat(savedBGM);
        if (savedSE !== null) this.seVolume = parseFloat(savedSE);
    }

    setBGMVolume(volume: number) {
        this.bgmVolume = Math.max(0, Math.min(1, volume));
        if (this.bgm) this.bgm.volume = this.bgmVolume;
        localStorage.setItem('bgmVolume', this.bgmVolume.toString());
    }

    setSEVolume(volume: number) {
        this.seVolume = Math.max(0, Math.min(1, volume));
        localStorage.setItem('seVolume', this.seVolume.toString());
    }

    getBGMVolume() { return this.bgmVolume; }
    getSEVolume() { return this.seVolume; }

    playBGM(name: string, fadeDuration: number = 1000) {
        const path = `sounds/bgm_${name}.mp3`;
        console.log(`[Audio] Request BGM: ${name} `);

        if (this.currentBgmName === name && this.bgm && !this.bgm.paused) return;

        if (this.bgm) {
            this.stopBGM(500);
        }

        const audio = new Audio(path);
        audio.loop = true;
        audio.volume = 0;

        audio.play().catch(e => console.error("[Audio] BGM play failed (Autoplay block?):", e));

        this.bgm = audio;
        this.currentBgmName = name;

        this.fadeIn(audio, this.bgmVolume, fadeDuration);
    }

    stopBGM(fadeDuration: number = 1000) {
        if (!this.bgm) return;

        const audio = this.bgm;
        this.bgm = null;
        this.currentBgmName = null;

        this.fadeOut(audio, fadeDuration, () => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    playSE(name: string) {
        const path = `sounds/se_${name}.mp3`;

        let audio = this.seCache.get(name);
        if (!audio) {
            audio = new Audio(path);
            this.seCache.set(name, audio);
        }

        const clone = audio.cloneNode() as HTMLAudioElement;
        clone.volume = this.seVolume;
        clone.play().catch(e => console.error(`[Audio] SE failed(${name}): `, e));
    }

    // Helper: Fade In
    private fadeIn(audio: HTMLAudioElement, targetVolume: number, duration: number) {
        if (duration <= 0) {
            audio.volume = targetVolume;
            return;
        }

        let vol = 0;
        const step = targetVolume / (duration / 50); // 50ms steps

        const timer = setInterval(() => {
            if (!audio) { clearInterval(timer); return; }
            vol += step;
            if (vol >= targetVolume) {
                vol = targetVolume;
                clearInterval(timer);
            }
            audio.volume = vol;
        }, 50);
    }

    // Helper: Fade Out
    private fadeOut(audio: HTMLAudioElement, duration: number, onComplete?: () => void) {
        if (duration <= 0) {
            audio.volume = 0;
            onComplete?.();
            return;
        }

        let vol = audio.volume;
        const step = vol / (duration / 50);

        const timer = setInterval(() => {
            vol -= step;
            if (vol <= 0) {
                vol = 0;
                clearInterval(timer);
                onComplete?.();
            }
            audio.volume = vol;
        }, 50);
    }
}

export const audioService = new AudioService();
