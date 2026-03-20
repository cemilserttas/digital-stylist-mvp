'use client';

import { useCallback } from 'react';

const SUCCESS_CHORDS = [523.25, 659.25, 1046.50];

type WebkitWindow = Window & { webkitAudioContext?: typeof AudioContext };

function getAudioContext(): typeof AudioContext | undefined {
    return window.AudioContext || (window as WebkitWindow).webkitAudioContext;
}

export function useSoundEffects() {
    const playPop = useCallback(() => {
        try {
            const AC = getAudioContext();
            if (!AC) return;

            const ctx = new AC();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.frequency.setValueAtTime(800, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);

            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

            osc.start(ctx.currentTime);
            osc.stop(ctx.currentTime + 0.1);
        } catch (err) {
            console.error('Audio error:', err);
        }
    }, []);

    const playSuccessChime = useCallback(() => {
        try {
            const AC = getAudioContext();
            if (!AC) return;

            const ctx = new AC();

            SUCCESS_CHORDS.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'triangle'; // Bell-like

                const startTime = ctx.currentTime + (idx * 0.1);
                const duration = 0.6;

                osc.frequency.setValueAtTime(freq, startTime);

                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.2, startTime + 0.05);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

                osc.start(startTime);
                osc.stop(startTime + duration);
            });
        } catch (err) {
            console.error('Audio error:', err);
        }
    }, []);

    const playSwipe = useCallback(() => {
        try {
            const AC = getAudioContext();
            if (!AC) return;
            const ctx = new AC();
            const bufferSize = ctx.sampleRate * 0.1;
            const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noiseSource = ctx.createBufferSource();
            noiseSource.buffer = buffer;
            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(1000, ctx.currentTime);
            filter.frequency.linearRampToValueAtTime(400, ctx.currentTime + 0.1);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 0.02);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);

            noiseSource.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noiseSource.start();
        } catch { }
    }, []);

    return { playPop, playSuccessChime, playSwipe };
}
