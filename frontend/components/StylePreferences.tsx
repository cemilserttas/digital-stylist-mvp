'use client';

import { useState } from 'react';
import { useSoundEffects } from '@/hooks/useSoundEffects';
import { Check, ArrowRight, Sparkles } from 'lucide-react';

interface StylePreferencesProps {
    userName: string;
    initialPreferences?: string;
    onComplete: (preferences: string) => void;
    inline?: boolean;
}

const STYLE_CATEGORIES = [
    {
        title: 'Quel est ton style ?',
        subtitle: 'Choisis un ou plusieurs styles qui te ressemblent',
        key: 'styles',
        items: [
            { id: 'streetwear', label: 'Streetwear', emoji: '🔥' },
            { id: 'casual', label: 'Casual', emoji: '👕' },
            { id: 'chic', label: 'Chic', emoji: '✨' },
            { id: 'sportswear', label: 'Sportswear', emoji: '🏃' },
            { id: 'boheme', label: 'Bohème', emoji: '🌸' },
            { id: 'vintage', label: 'Vintage', emoji: '🕰️' },
            { id: 'minimaliste', label: 'Minimaliste', emoji: '⬜' },
            { id: 'classique', label: 'Classique', emoji: '👔' },
            { id: 'grunge', label: 'Grunge', emoji: '🎸' },
            { id: 'preppy', label: 'Preppy', emoji: '🏫' },
            { id: 'punk', label: 'Punk', emoji: '🖤' },
            { id: 'avant-garde', label: 'Avant-garde', emoji: '🎭' },
        ],
    },
    {
        title: 'Quels vêtements tu préfères ?',
        subtitle: 'Sélectionne les types de pièces que tu aimes porter',
        key: 'clothing',
        items: [
            { id: 'tshirts', label: 'T-shirts', emoji: '👕' },
            { id: 'jeans', label: 'Jeans', emoji: '👖' },
            { id: 'sneakers', label: 'Sneakers', emoji: '👟' },
            { id: 'blazers', label: 'Blazers', emoji: '🧥' },
            { id: 'hoodies', label: 'Hoodies', emoji: '🧷' },
            { id: 'chemises', label: 'Chemises', emoji: '👔' },
            { id: 'robes', label: 'Robes', emoji: '👗' },
            { id: 'manteaux', label: 'Manteaux', emoji: '🧥' },
            { id: 'shorts', label: 'Shorts', emoji: '🩳' },
            { id: 'boots', label: 'Boots', emoji: '🥾' },
            { id: 'accessoires', label: 'Accessoires', emoji: '🧢' },
            { id: 'costumes', label: 'Costumes', emoji: '🤵' },
        ],
    },
    {
        title: "Qu'est-ce qui t'intéresse ?",
        subtitle: 'Tes centres d\'intérêt mode',
        key: 'interests',
        items: [
            { id: 'bons-plans', label: 'Bons plans', emoji: '💰' },
            { id: 'tendances', label: 'Tendances', emoji: '📈' },
            { id: 'grandes-marques', label: 'Grandes marques', emoji: '💎' },
            { id: 'mode-durable', label: 'Mode durable', emoji: '♻️' },
            { id: 'seconde-main', label: 'Seconde main', emoji: '🔄' },
            { id: 'haute-couture', label: 'Haute couture', emoji: '👑' },
            { id: 'sport-mode', label: 'Sport & Mode', emoji: '🏀' },
            { id: 'luxe-accessible', label: 'Luxe accessible', emoji: '⭐' },
        ],
    },
];

export default function StylePreferences({ userName, initialPreferences, onComplete, inline = false }: StylePreferencesProps) {
    const [step, setStep] = useState(0);
    const [selections, setSelections] = useState<Record<string, string[]>>(() => {
        if (initialPreferences) {
            try {
                return JSON.parse(initialPreferences);
            } catch { /* ignore */ }
        }
        return { styles: [], clothing: [], interests: [] };
    });

    const currentCategory = STYLE_CATEGORIES[step];
    const currentKey = currentCategory.key;
    const currentSelections = selections[currentKey] || [];
    const { playPop, playSuccessChime } = useSoundEffects();

    const toggleItem = (id: string) => {
        playPop();
        setSelections((prev) => {
            const current = prev[currentKey] || [];
            return {
                ...prev,
                [currentKey]: current.includes(id)
                    ? current.filter((i) => i !== id)
                    : [...current, id],
            };
        });
    };

    const totalSelected =
        (selections.styles?.length || 0) +
        (selections.clothing?.length || 0) +
        (selections.interests?.length || 0);

    const handleNext = () => {
        if (step < STYLE_CATEGORIES.length - 1) {
            playPop();
            setStep(step + 1);
        } else {
            playSuccessChime();
            onComplete(JSON.stringify(selections));
        }
    };

    const handleBack = () => {
        if (step > 0) {
            playPop();
            setStep(step - 1);
        }
    };

    const isLast = step === STYLE_CATEGORIES.length - 1;

    return (
        <div className={inline ? 'w-full' : 'min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4 py-8'}>
            {/* Progress bar */}
            <div className={`${inline ? 'w-full' : 'w-full max-w-2xl'} mb-6`}>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-500">Étape {step + 1} / {STYLE_CATEGORIES.length}</p>
                    <p className="text-xs text-gray-500">{totalSelected} sélectionné{totalSelected > 1 ? 's' : ''}</p>
                </div>
                <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-500 rounded-full"
                        style={{ width: `${((step + 1) / STYLE_CATEGORIES.length) * 100}%` }}
                    />
                </div>
            </div>

            {/* Header */}
            {!inline && (
                <div className="text-center mb-8 max-w-2xl">
                    <div className="inline-flex items-center gap-2 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-1.5 rounded-full text-xs font-medium mb-4">
                        <Sparkles className="w-3.5 h-3.5" />
                        Personnalisation
                    </div>
                    <h1 className="text-3xl font-black text-white mb-2">
                        {currentCategory.title}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {currentCategory.subtitle}
                    </p>
                </div>
            )}
            {inline && (
                <div className="mb-4">
                    <h3 className="text-base font-bold text-white mb-1">{currentCategory.title}</h3>
                    <p className="text-xs text-gray-500">{currentCategory.subtitle}</p>
                </div>
            )}

            {/* Grid */}
            <div className={inline ? 'w-full' : 'w-full max-w-2xl'}>
                <div className={`grid gap-3 ${currentKey === 'interests' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4'}`}>
                    {currentCategory.items.map((item) => {
                        const selected = currentSelections.includes(item.id);
                        return (
                            <button
                                key={item.id}
                                onClick={() => toggleItem(item.id)}
                                className={`relative flex flex-col items-center justify-center gap-2 p-5 rounded-2xl border-2 transition-all duration-200 ${selected
                                    ? 'bg-green-500/15 border-green-500/60 shadow-lg shadow-green-500/10 scale-[1.02]'
                                    : 'bg-white/5 border-white/10 hover:border-white/20 hover:bg-white/8'
                                    }`}
                            >
                                {/* Check badge */}
                                {selected && (
                                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                                        <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />
                                    </div>
                                )}

                                <span className="text-2xl">{item.emoji}</span>
                                <span className={`text-sm font-medium ${selected ? 'text-green-300' : 'text-gray-300'}`}>
                                    {item.label}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Navigation */}
            <div className={`${inline ? 'w-full' : 'w-full max-w-2xl'} mt-6 flex items-center justify-between`}>
                <button
                    onClick={handleBack}
                    className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-colors ${step === 0
                        ? 'text-gray-700 cursor-default'
                        : 'text-gray-400 hover:text-white bg-white/5 hover:bg-white/10'
                        }`}
                    disabled={step === 0}
                >
                    ← Retour
                </button>

                <button
                    onClick={handleNext}
                    disabled={currentSelections.length === 0}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isLast
                        ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white hover:shadow-lg hover:shadow-green-500/20'
                        : 'bg-white text-gray-900 hover:bg-gray-100'
                        }`}
                >
                    {isLast ? (
                        <>
                            Terminer
                            <Sparkles className="w-4 h-4" />
                        </>
                    ) : (
                        <>
                            Suivant
                            <ArrowRight className="w-4 h-4" />
                        </>
                    )}
                </button>
            </div>

            {/* Skip */}
            {!inline && (
                <button
                    onClick={() => onComplete(JSON.stringify(selections))}
                    className="mt-4 text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                    Passer cette étape →
                </button>
            )}
        </div>
    );
}
