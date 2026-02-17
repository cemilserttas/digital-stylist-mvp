'use client';

import { useMemo } from 'react';

interface WeatherAnimationProps {
    weatherCode: string;
}

export default function WeatherAnimation({ weatherCode }: WeatherAnimationProps) {
    const particles = useMemo(() => {
        const count = weatherCode.includes('snow') ? 60 : weatherCode.includes('rain') || weatherCode.includes('shower') || weatherCode.includes('drizzle') ? 80 : 30;
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            left: Math.random() * 100,
            delay: Math.random() * 5,
            duration: 1 + Math.random() * 3,
            size: 2 + Math.random() * 4,
            opacity: 0.3 + Math.random() * 0.5,
        }));
    }, [weatherCode]);

    const getAnimationType = () => {
        if (weatherCode.includes('thunder')) return 'thunder';
        if (weatherCode.includes('rain') || weatherCode.includes('shower')) return 'rain';
        if (weatherCode.includes('drizzle')) return 'drizzle';
        if (weatherCode.includes('snow')) return 'snow';
        if (weatherCode.includes('cloud') || weatherCode.includes('overcast')) return 'clouds';
        if (weatherCode.includes('wind')) return 'wind';
        return 'sun';
    };

    const type = getAnimationType();

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
            {/* Gradient overlays per weather */}
            {type === 'sun' && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-br from-amber-500/15 to-orange-400/10" />
                    {/* Sun rays */}
                    <div className="sun-glow" />
                    {particles.slice(0, 8).map((p) => (
                        <div
                            key={p.id}
                            className="sun-ray"
                            style={{
                                left: `${40 + p.left * 0.3}%`,
                                top: '-10%',
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${3 + p.duration}s`,
                                opacity: p.opacity * 0.3,
                                transform: `rotate(${p.id * 45}deg)`,
                            }}
                        />
                    ))}
                    {/* Floating dust particles for sunny day */}
                    {particles.slice(8, 20).map((p) => (
                        <div
                            key={`dust-${p.id}`}
                            className="dust-particle"
                            style={{
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${4 + p.duration * 2}s`,
                                opacity: p.opacity * 0.4,
                            }}
                        />
                    ))}
                </>
            )}

            {type === 'clouds' && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-400/15 to-gray-500/10" />
                    {particles.slice(0, 6).map((p) => (
                        <div
                            key={p.id}
                            className="cloud-shape"
                            style={{
                                left: `${-20 + p.left * 1.2}%`,
                                top: `${10 + (p.id % 3) * 25}%`,
                                animationDelay: `${p.delay * 2}s`,
                                animationDuration: `${15 + p.duration * 5}s`,
                                opacity: p.opacity * 0.2,
                                transform: `scale(${0.5 + p.size * 0.15})`,
                            }}
                        />
                    ))}
                </>
            )}

            {(type === 'rain' || type === 'thunder') && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-900/20 to-slate-800/15" />
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="raindrop"
                            style={{
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${0.4 + p.duration * 0.3}s`,
                                opacity: p.opacity * 0.6,
                                height: `${8 + p.size * 3}px`,
                            }}
                        />
                    ))}
                    {type === 'thunder' && <div className="lightning-flash" />}
                </>
            )}

            {type === 'drizzle' && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-800/10 to-slate-700/10" />
                    {particles.slice(0, 40).map((p) => (
                        <div
                            key={p.id}
                            className="drizzle-drop"
                            style={{
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${1 + p.duration * 0.5}s`,
                                opacity: p.opacity * 0.4,
                            }}
                        />
                    ))}
                </>
            )}

            {type === 'snow' && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-b from-blue-200/10 to-white/5" />
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="snowflake"
                            style={{
                                left: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${3 + p.duration * 2}s`,
                                opacity: p.opacity * 0.7,
                                width: `${p.size}px`,
                                height: `${p.size}px`,
                            }}
                        />
                    ))}
                </>
            )}

            {type === 'wind' && (
                <>
                    <div className="absolute inset-0 bg-gradient-to-r from-gray-400/10 to-transparent" />
                    {particles.slice(0, 15).map((p) => (
                        <div
                            key={p.id}
                            className="wind-streak"
                            style={{
                                top: `${p.left}%`,
                                animationDelay: `${p.delay}s`,
                                animationDuration: `${1 + p.duration}s`,
                                opacity: p.opacity * 0.2,
                                width: `${30 + p.size * 15}px`,
                            }}
                        />
                    ))}
                </>
            )}

            <style jsx>{`
        /* ===== SUN ===== */
        .sun-glow {
          position: absolute;
          top: -30%;
          right: -10%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, rgba(251, 191, 36, 0.3) 0%, rgba(251, 191, 36, 0) 70%);
          border-radius: 50%;
          animation: sunPulse 4s ease-in-out infinite;
        }
        .sun-ray {
          position: absolute;
          width: 2px;
          height: 120px;
          background: linear-gradient(to bottom, rgba(251, 191, 36, 0.4), transparent);
          transform-origin: top center;
          animation: rayPulse 3s ease-in-out infinite alternate;
        }
        .dust-particle {
          position: absolute;
          width: 3px;
          height: 3px;
          background: rgba(251, 191, 36, 0.5);
          border-radius: 50%;
          animation: dustFloat 6s ease-in-out infinite;
        }
        @keyframes sunPulse {
          0%, 100% { transform: scale(1); opacity: 0.3; }
          50% { transform: scale(1.2); opacity: 0.5; }
        }
        @keyframes rayPulse {
          0% { opacity: 0.1; height: 80px; }
          100% { opacity: 0.3; height: 140px; }
        }
        @keyframes dustFloat {
          0% { transform: translate(0, 100%) scale(0); opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { transform: translate(40px, -20px) scale(1); opacity: 0; }
        }

        /* ===== CLOUDS ===== */
        .cloud-shape {
          position: absolute;
          width: 120px;
          height: 50px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 50px;
          filter: blur(8px);
          animation: cloudDrift linear infinite;
        }
        .cloud-shape::before {
          content: '';
          position: absolute;
          top: -20px;
          left: 25px;
          width: 60px;
          height: 60px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 50%;
        }
        @keyframes cloudDrift {
          0% { transform: translateX(-100px); }
          100% { transform: translateX(calc(100vw + 100px)); }
        }

        /* ===== RAIN ===== */
        .raindrop {
          position: absolute;
          top: -20px;
          width: 2px;
          background: linear-gradient(to bottom, transparent, rgba(147, 197, 253, 0.7));
          border-radius: 0 0 2px 2px;
          animation: rainFall linear infinite;
        }
        @keyframes rainFall {
          0% { transform: translateY(-20px); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(300px); opacity: 0; }
        }

        /* ===== DRIZZLE ===== */
        .drizzle-drop {
          position: absolute;
          top: -10px;
          width: 1px;
          height: 6px;
          background: linear-gradient(to bottom, transparent, rgba(147, 197, 253, 0.5));
          border-radius: 0 0 1px 1px;
          animation: drizzleFall linear infinite;
        }
        @keyframes drizzleFall {
          0% { transform: translateY(-10px) translateX(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.6; }
          100% { transform: translateY(250px) translateX(-20px); opacity: 0; }
        }

        /* ===== SNOW ===== */
        .snowflake {
          position: absolute;
          top: -10px;
          background: white;
          border-radius: 50%;
          filter: blur(1px);
          animation: snowFall linear infinite;
        }
        @keyframes snowFall {
          0% { transform: translateY(-10px) translateX(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          50% { transform: translateY(150px) translateX(30px) rotate(180deg); }
          90% { opacity: 0.8; }
          100% { transform: translateY(300px) translateX(-10px) rotate(360deg); opacity: 0; }
        }

        /* ===== THUNDER ===== */
        .lightning-flash {
          position: absolute;
          inset: 0;
          background: white;
          animation: lightning 6s ease-in-out infinite;
        }
        @keyframes lightning {
          0%, 100% { opacity: 0; }
          92% { opacity: 0; }
          93% { opacity: 0.6; }
          94% { opacity: 0; }
          96% { opacity: 0.3; }
          97% { opacity: 0; }
        }

        /* ===== WIND ===== */
        .wind-streak {
          position: absolute;
          left: -50px;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.3), transparent);
          animation: windBlow ease-in-out infinite;
        }
        @keyframes windBlow {
          0% { transform: translateX(-100px) scaleX(0.5); opacity: 0; }
          30% { opacity: 1; }
          70% { opacity: 1; }
          100% { transform: translateX(calc(100vw + 100px)) scaleX(1.5); opacity: 0; }
        }
      `}</style>
        </div>
    );
}
