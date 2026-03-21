'use client';

import { useState, useEffect } from 'react';
import type { WeatherData, DayForecast } from '@/lib/types';

function weatherCodeToInfo(code: number): { description: string; icon: string } {
    if (code >= 95) return { description: 'Orage', icon: 'thunder' };
    if (code >= 80) return { description: 'Averses', icon: 'shower' };
    if (code >= 71) return { description: 'Neige', icon: 'snow' };
    if (code >= 61) return { description: 'Pluie', icon: 'rain' };
    if (code >= 51) return { description: 'Bruine', icon: 'drizzle' };
    if (code >= 45) return { description: 'Brouillard', icon: 'cloud' };
    if (code >= 3)  return { description: 'Nuageux', icon: 'cloud' };
    if (code >= 1)  return { description: 'Partiellement nuageux', icon: 'cloud' };
    return { description: 'Ensoleillé', icon: 'clear' };
}

/**
 * Perceived comfort index 0–10 using a simplified UTCI approximation.
 * 10 = perfect outdoor conditions, 0 = extreme discomfort.
 */
function computeComfortIndex(temp: number, humidity: number, windSpeed: number): number {
    // Heat index penalty (above 25°C)
    const heatPenalty = temp > 25 ? Math.min((temp - 25) * 0.3 + (humidity - 50) * 0.05, 4) : 0;
    // Cold penalty (below 10°C)
    const coldPenalty = temp < 10 ? Math.min((10 - temp) * 0.4 + windSpeed * 0.1, 5) : 0;
    // Wind chill penalty
    const windPenalty = windSpeed > 30 ? (windSpeed - 30) * 0.05 : 0;
    const raw = 10 - heatPenalty - coldPenalty - windPenalty;
    return Math.max(0, Math.min(10, Math.round(raw * 10) / 10));
}

export function useWeather(): WeatherData | null {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        async function fetchWeather(lat: number, lon: number) {
            try {
                // Reverse geocode for city name
                let ville = 'Paris';
                try {
                    const geoRes = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
                        { headers: { 'Accept-Language': 'fr' } }
                    );
                    const geoData = await geoRes.json();
                    if (geoData?.address) {
                        ville = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.municipality || 'Paris';
                    }
                } catch {
                    try {
                        const backup = await fetch(
                            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`
                        );
                        const bd = await backup.json();
                        ville = bd.city || bd.locality || 'Paris';
                    } catch { /* keep default */ }
                }

                // Open-Meteo: current + 7-day daily forecast in one request
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast` +
                    `?latitude=${lat}&longitude=${lon}` +
                    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code,uv_index` +
                    `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,uv_index_max` +
                    `&timezone=auto&forecast_days=7`
                );
                const data = await weatherRes.json();
                const cur = data.current;
                const daily = data.daily;

                const { description, icon } = weatherCodeToInfo(cur.weather_code ?? 0);
                const humidity = cur.relative_humidity_2m ?? 60;
                const windSpeed = Math.round(cur.wind_speed_10m ?? 0);
                const uvIndex = cur.uv_index ? Math.round(cur.uv_index * 10) / 10 : undefined;
                const comfortIndex = computeComfortIndex(cur.temperature_2m, humidity, windSpeed);

                // Build 7-day forecast array
                const forecast: DayForecast[] = (daily?.time ?? []).map((date: string, i: number) => {
                    const fc = weatherCodeToInfo(daily.weather_code[i] ?? 0);
                    return {
                        date,
                        temp_max: Math.round(daily.temperature_2m_max[i]),
                        temp_min: Math.round(daily.temperature_2m_min[i]),
                        description: fc.description,
                        icon: fc.icon,
                        uv_index: Math.round((daily.uv_index_max?.[i] ?? 0) * 10) / 10,
                        precipitation_probability: daily.precipitation_probability_max?.[i] ?? 0,
                    };
                });

                setWeather({
                    temperature: Math.round(cur.temperature_2m),
                    description,
                    ville,
                    icon,
                    humidity,
                    wind_speed: windSpeed,
                    uv_index: uvIndex,
                    comfort_index: comfortIndex,
                    forecast,
                });
            } catch (err) {
                console.error('Weather fetch failed:', err);
                setWeather({ temperature: 15, description: 'Indisponible', ville: 'Paris', icon: 'cloud' });
            }
        }

        async function handleGeolocationError() {
            try {
                const ipRes = await fetch('https://ipapi.co/json/');
                const ipData = await ipRes.json();
                if (ipData.latitude && ipData.longitude) {
                    fetchWeather(ipData.latitude, ipData.longitude);
                } else {
                    fetchWeather(48.8566, 2.3522);
                }
            } catch {
                fetchWeather(48.8566, 2.3522);
            }
        }

        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
                handleGeolocationError,
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            handleGeolocationError();
        }
    }, []);

    return weather;
}
