import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeather } from '@/hooks/useWeather';

const mockDaily = {
    time: ['2026-03-21', '2026-03-22', '2026-03-23', '2026-03-24', '2026-03-25'],
    weather_code: [0, 61, 3, 80, 95],
    temperature_2m_max: [20, 18, 16, 14, 12],
    temperature_2m_min: [10, 8, 6, 5, 4],
    precipitation_probability_max: [0, 80, 20, 60, 90],
    uv_index_max: [3.5, 1.2, 2.0, 0.5, 0.1],
};

function makeWeatherResponse(weather_code = 0, extra = {}) {
    return {
        current: {
            temperature_2m: 18,
            relative_humidity_2m: 65,
            wind_speed_10m: 12,
            weather_code,
            uv_index: 3.5,
            ...extra,
        },
        daily: mockDaily,
    };
}

const mockGeoResponse = { address: { city: 'Paris' } };

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
            return Promise.resolve({ json: () => Promise.resolve(makeWeatherResponse()) });
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

    it('fetches and returns weather data with forecast', async () => {
        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current).not.toBeNull());

        expect(result.current?.temperature).toBe(18);
        expect(result.current?.ville).toBe('Paris');
        expect(result.current?.description).toBe('Ensoleillé');
        expect(result.current?.icon).toBe('clear');
        expect(result.current?.uv_index).toBe(3.5);
        expect(result.current?.comfort_index).toBeGreaterThanOrEqual(0);
        expect(result.current?.forecast).toHaveLength(5);
        expect(result.current?.forecast?.[0].date).toBe('2026-03-21');
    });

    it('maps weather code >= 61 to rain', async () => {
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.includes('nominatim')) {
                return Promise.resolve({ json: () => Promise.resolve(mockGeoResponse) });
            }
            return Promise.resolve({
                json: () => Promise.resolve(makeWeatherResponse(61)),
            });
        }));

        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current).not.toBeNull());

        expect(result.current?.icon).toBe('rain');
        expect(result.current?.description).toBe('Pluie');
    });

    it('forecast entries include precipitation probability', async () => {
        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current?.forecast).toBeDefined());

        const rainyDay = result.current?.forecast?.find(d => d.precipitation_probability === 80);
        expect(rainyDay).toBeDefined();
        expect(rainyDay?.icon).toBe('rain');
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
            return Promise.resolve({ json: () => Promise.resolve(makeWeatherResponse()) });
        }));

        const { result } = renderHook(() => useWeather());
        await waitFor(() => expect(result.current).not.toBeNull());
        expect(result.current?.temperature).toBe(18);
    });
});
