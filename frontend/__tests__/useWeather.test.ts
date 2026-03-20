import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeather } from '@/hooks/useWeather';

const mockWeatherResponse = {
    current: {
        temperature_2m: 18,
        relative_humidity_2m: 65,
        wind_speed_10m: 12,
        weather_code: 0,
    },
};

const mockGeoResponse = {
    address: { city: 'Paris' },
};

beforeEach(() => {
    vi.stubGlobal('navigator', {
        geolocation: {
            getCurrentPosition: vi.fn((success) => {
                success({ coords: { latitude: 48.8566, longitude: 2.3522 } });
            }),
        },
    });

    vi.stubGlobal('fetch', vi.fn((url: string) => {
        if (url.includes('nominatim')) {
            return Promise.resolve({ json: () => Promise.resolve(mockGeoResponse) });
        }
        if (url.includes('open-meteo')) {
            return Promise.resolve({ json: () => Promise.resolve(mockWeatherResponse) });
        }
        return Promise.resolve({ json: () => Promise.resolve({}) });
    }));
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('useWeather', () => {
    it('returns null initially', () => {
        const { result } = renderHook(() => useWeather());
        expect(result.current).toBeNull();
    });

    it('fetches and returns weather data', async () => {
        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current).not.toBeNull());

        expect(result.current?.temperature).toBe(18);
        expect(result.current?.ville).toBe('Paris');
        expect(result.current?.description).toBe('Ensoleillé');
        expect(result.current?.icon).toBe('clear');
    });

    it('maps weather code >= 61 to rain', async () => {
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.includes('nominatim')) {
                return Promise.resolve({ json: () => Promise.resolve(mockGeoResponse) });
            }
            return Promise.resolve({
                json: () => Promise.resolve({
                    current: { ...mockWeatherResponse.current, weather_code: 61 },
                }),
            });
        }));

        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current).not.toBeNull());

        expect(result.current?.icon).toBe('rain');
        expect(result.current?.description).toBe('Pluie');
    });

    it('falls back to Paris on geolocation error', async () => {
        vi.stubGlobal('navigator', {
            geolocation: {
                getCurrentPosition: vi.fn((_success, error) => error(new Error('denied'))),
            },
        });
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.includes('ipapi')) {
                return Promise.resolve({
                    json: () => Promise.resolve({ latitude: 48.8566, longitude: 2.3522 }),
                });
            }
            if (url.includes('nominatim')) {
                return Promise.resolve({ json: () => Promise.resolve(mockGeoResponse) });
            }
            return Promise.resolve({ json: () => Promise.resolve(mockWeatherResponse) });
        }));

        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current).not.toBeNull());
        expect(result.current?.temperature).toBe(18);
    });
});
