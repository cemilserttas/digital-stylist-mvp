'use client';

import { useState } from 'react';
import { LogIn, UserPlus, Loader2, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

const MORPHOLOGIES = [
    { value: "TRIANGLE", label: "Triangle", desc: "Épaules étroites, hanches larges" },
    { value: "OVALE", label: "Ovale", desc: "Rondeurs au niveau du ventre" },
    { value: "RECTANGLE", label: "Rectangle", desc: "Silhouette droite" },
    { value: "SABLIER", label: "Sablier", desc: "Taille marquée" },
    { value: "TRAPEZE", label: "Trapèze", desc: "Épaules larges, hanches étroites" },
];

interface UserFormProps {
    onUserCreated: (user: { id: number; prenom: string; morphologie: string; genre: string; age: number }) => void;
}

type Mode = 'login' | 'register';

export default function UserForm({ onUserCreated }: UserFormProps) {
    const [mode, setMode] = useState<Mode>('login');
    const [step, setStep] = useState(1);
    const [prenom, setPrenom] = useState('');
    const [genre, setGenre] = useState('Homme');
    const [age, setAge] = useState(25);
    const [morphologie, setMorphologie] = useState(MORPHOLOGIES[2].value);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!prenom.trim()) return;
        setLoading(true);
        setError(null);

        try {
            if (mode === 'login') {
                const response = await api.post('/users/login', { prenom: prenom.trim() });
                onUserCreated(response.data);
            } else {
                const response = await api.post('/users/create', {
                    prenom: prenom.trim(),
                    morphologie,
                    genre,
                    age,
                });
                onUserCreated(response.data);
            }
        } catch (err: unknown) {
            const axiosErr = err as { response?: { status?: number; data?: { detail?: string } } };
            if (mode === 'login' && axiosErr.response?.status === 404) {
                setError(`Aucun compte trouvé pour "${prenom}".`);
            } else if (axiosErr.response?.data?.detail) {
                setError(axiosErr.response.data.detail);
            } else {
                setError("Erreur de connexion au serveur.");
            }
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && !prenom.trim()) return;
        setStep(s => Math.min(s + 1, 3));
    };

    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-gray-950 via-gray-900 to-black p-4">
            {/* Background pattern */}
            <div className="fixed inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle at 25% 25%, white 1px, transparent 1px)',
                backgroundSize: '50px 50px',
            }} />

            <div className="relative max-w-lg w-full">
                {/* Logo */}
                <div className="text-center mb-10">
                    <div className="inline-flex items-center gap-2 mb-3">
                        <Sparkles className="w-6 h-6 text-purple-400" />
                        <h1 className="text-4xl font-black tracking-tight text-white">
                            DIGITAL<span className="text-purple-400">STYLIST</span>
                        </h1>
                    </div>
                    <p className="text-gray-400 text-sm">Votre styliste personnel propulsé par l&apos;intelligence artificielle</p>
                </div>

                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                    {/* Mode tabs */}
                    <div className="flex bg-white/5 rounded-2xl p-1 mb-8">
                        <button
                            type="button"
                            onClick={() => { setMode('login'); setError(null); setStep(1); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'login'
                                    ? 'bg-white text-gray-900 shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <LogIn className="w-4 h-4" />
                            Connexion
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('register'); setError(null); setStep(1); }}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${mode === 'register'
                                    ? 'bg-white text-gray-900 shadow-lg'
                                    : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            <UserPlus className="w-4 h-4" />
                            S&apos;inscrire
                        </button>
                    </div>

                    {/* Login mode */}
                    {mode === 'login' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">Prénom</label>
                                <input
                                    type="text"
                                    required
                                    className="w-full px-4 py-3.5 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                    value={prenom}
                                    onChange={(e) => setPrenom(e.target.value)}
                                    placeholder="Entrez votre prénom"
                                    autoFocus
                                />
                            </div>

                            {error && (
                                <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                    {error}
                                    <button
                                        type="button"
                                        onClick={() => { setMode('register'); setError(null); }}
                                        className="block mt-2 text-purple-400 font-bold underline text-xs"
                                    >
                                        → Créer un compte
                                    </button>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !prenom.trim()}
                                className="w-full bg-white text-gray-900 py-3.5 rounded-xl font-bold hover:bg-gray-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                        Connexion...
                                    </span>
                                ) : 'Se connecter'}
                            </button>
                        </form>
                    )}

                    {/* Register mode */}
                    {mode === 'register' && (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Progress */}
                            <div className="flex gap-2 mb-2">
                                {[1, 2, 3].map((s) => (
                                    <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-purple-500' : 'bg-white/10'
                                        }`} />
                                ))}
                            </div>

                            {/* Step 1: Name + Gender */}
                            {step === 1 && (
                                <div className="space-y-5" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Prénom</label>
                                        <input
                                            type="text"
                                            required
                                            className="w-full px-4 py-3.5 bg-white/10 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                                            value={prenom}
                                            onChange={(e) => setPrenom(e.target.value)}
                                            placeholder="Votre prénom"
                                            autoFocus
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Genre</label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {['Homme', 'Femme'].map((g) => (
                                                <button
                                                    key={g}
                                                    type="button"
                                                    onClick={() => setGenre(g)}
                                                    className={`py-3.5 rounded-xl font-bold text-sm transition-all ${genre === g
                                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                                            : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    {g === 'Homme' ? '👨' : '👩'} {g}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={nextStep}
                                        disabled={!prenom.trim()}
                                        className="w-full bg-purple-600 text-white py-3.5 rounded-xl font-bold hover:bg-purple-700 transition-all disabled:opacity-50 active:scale-[0.98]"
                                    >
                                        Suivant →
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Age */}
                            {step === 2 && (
                                <div className="space-y-5" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-2">Âge</label>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="range"
                                                min="14"
                                                max="70"
                                                value={age}
                                                onChange={(e) => setAge(Number(e.target.value))}
                                                className="flex-1 accent-purple-500"
                                            />
                                            <span className="text-3xl font-black text-white w-16 text-center">{age}</span>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">
                                            Cela nous aide à adapter les suggestions à votre tranche d&apos;âge
                                        </p>
                                    </div>
                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(1)}
                                            className="flex-1 bg-white/5 text-gray-300 py-3.5 rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10"
                                        >
                                            ← Retour
                                        </button>
                                        <button
                                            type="button"
                                            onClick={nextStep}
                                            className="flex-1 bg-purple-600 text-white py-3.5 rounded-xl font-bold hover:bg-purple-700 transition-all active:scale-[0.98]"
                                        >
                                            Suivant →
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Step 3: Morphology */}
                            {step === 3 && (
                                <div className="space-y-5" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-300 mb-3">Morphologie</label>
                                        <div className="space-y-2">
                                            {MORPHOLOGIES.map((m) => (
                                                <button
                                                    key={m.value}
                                                    type="button"
                                                    onClick={() => setMorphologie(m.value)}
                                                    className={`w-full text-left px-4 py-3 rounded-xl transition-all flex items-center justify-between ${morphologie === m.value
                                                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                                                            : 'bg-white/5 text-gray-300 border border-white/10 hover:bg-white/10'
                                                        }`}
                                                >
                                                    <div>
                                                        <p className="font-bold text-sm">{m.label}</p>
                                                        <p className={`text-xs ${morphologie === m.value ? 'text-white/70' : 'text-gray-500'}`}>{m.desc}</p>
                                                    </div>
                                                    {morphologie === m.value && (
                                                        <div className="w-5 h-5 bg-white rounded-full flex items-center justify-center">
                                                            <div className="w-2.5 h-2.5 bg-purple-600 rounded-full" />
                                                        </div>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {error && (
                                        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                                            {error}
                                        </div>
                                    )}

                                    <div className="flex gap-3">
                                        <button
                                            type="button"
                                            onClick={() => setStep(2)}
                                            className="flex-1 bg-white/5 text-gray-300 py-3.5 rounded-xl font-bold hover:bg-white/10 transition-all border border-white/10"
                                        >
                                            ← Retour
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 text-white py-3.5 rounded-xl font-bold hover:from-purple-700 hover:to-pink-700 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-purple-500/25"
                                        >
                                            {loading ? (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Loader2 className="w-5 h-5 animate-spin" />
                                                    Création...
                                                </span>
                                            ) : (
                                                <span className="flex items-center justify-center gap-2">
                                                    <Sparkles className="w-4 h-4" />
                                                    Créer mon profil
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div>

                <p className="text-center text-gray-600 text-xs mt-6">
                    Propulsé par l&apos;IA Google Gemini
                </p>
            </div>

            <style jsx>{`
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </div>
    );
}
