import { useCallback } from 'react';
import { useOSStore } from '@/store/useOSStore';

// Singleton AudioContext to avoid multiple initializations
let globalAudioContext: AudioContext | null = null;

const getAudioContext = () => {
    if (!globalAudioContext) {
        globalAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return globalAudioContext;
};

export const useSoundFX = () => {
    const { volume, isMuted, soundEnabled } = useOSStore();
    
    const playTone = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine') => {
        // Don't play if muted
        if (isMuted) return;
        
        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = type;
            oscillator.frequency.value = frequency;

            // Apply volume (convert 0-100 to 0-0.1 range)
            const volumeLevel = (volume / 100) * 0.1;
            gainNode.gain.setValueAtTime(volumeLevel, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + duration);
        } catch (error) {
            // Silently fail if audio context is not available
            console.warn('Audio playback failed:', error);
        }
    }, [volume, isMuted]);

    const playClick = useCallback(() => {
        if (!soundEnabled.click) return;
        // Short, sharp click sound
        playTone(800, 0.05, 'square');
    }, [playTone, soundEnabled.click]);

    const playHover = useCallback(() => {
        if (!soundEnabled.hover) return;
        // Subtle hover beep
        playTone(600, 0.03, 'sine');
    }, [playTone, soundEnabled.hover]);

    const playError = useCallback(() => {
        if (!soundEnabled.error) return;
        // Lower, longer error tone
        try {
            const ctx = getAudioContext();
            
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);
            
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(400, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
            
            const volumeLevel = (volume / 100) * 0.15;
            gainNode.gain.setValueAtTime(volumeLevel, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
            
            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.2);
        } catch (error) {
            console.warn('Audio playback failed:', error);
        }
    }, [volume, soundEnabled.error]);

    const playKeystroke = useCallback(() => {
        if (!soundEnabled.keypress) return;
        // Very short keystroke sound
        playTone(1200, 0.02, 'square');
    }, [playTone, soundEnabled.keypress]);

    return { playClick, playHover, playError, playKeystroke, playTone };
};
