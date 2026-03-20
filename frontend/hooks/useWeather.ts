'use client';

import { useState, useEffect } from 'react';
import type { WeatherData } from '@/lib/types';

export function useWeather(): WeatherData | null {
    const [weather, setWeather] = useState<WeatherData | null>(null);

    useEffect(() => {
        async function fetchWeather(lat: number, lon: number) {
            try {
                // Reverse geocode for city name using Nominatim
                let ville = 'Paris';
                try {
                    const geoRes = await fetch(
                        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10&addressdetails=1`,
                        { headers: { 'Accept-Language': 'fr' } }
                    );
                    const geoData = await geoRes.json();
                    if (geoData && geoData.address) {
                        ville = geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.municipality || 'Paris';
                    }
                } catch (err) {
                    console.error('Nominatim error, fallback to bigdatacloud', err);
                    const backupRes = await fetch(
                        `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=fr`
                    );
                    const backupData = await backupRes.json();
                    ville = backupData.city || backupData.locality || 'Paris';
                }

                // Open-Meteo for weather
                const weatherRes = await fetch(
                    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`
                );
                const weatherData = await weatherRes.json();
                const current = weatherData.current;

                const weatherCode = current.weather_code || 0;
                let description = 'Ensoleillé';
                let icon = 'clear';
                if (weatherCode >= 95) { description = 'Orage'; icon = 'thunder'; }
                else if (weatherCode >= 80) { description = 'Averses'; icon = 'shower'; }
                else if (weatherCode >= 71) { description = 'Neige'; icon = 'snow'; }
                else if (weatherCode >= 61) { description = 'Pluie'; icon = 'rain'; }
                else if (weatherCode >= 51) { description = 'Bruine'; icon = 'drizzle'; }
                else if (weatherCode >= 45) { description = 'Brouillard'; icon = 'cloud'; }
                else if (weatherCode >= 3) { description = 'Nuageux'; icon = 'cloud'; }
                else if (weatherCode >= 1) { description = 'Partiellement nuageux'; icon = 'cloud'; }

                setWeather({
                    temperature: Math.round(current.temperature_2m),
                    description,
                    ville,
                    icon,
                    humidity: current.relative_humidity_2m,
                    wind_speed: Math.round(current.wind_speed_10m),
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
            } catch (err) {
                console.error('IP Geolocation failed:', err);
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
