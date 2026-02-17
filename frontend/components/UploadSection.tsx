import { useState, useRef } from 'react';
import { Upload, Shirt, Loader2, Sparkles } from 'lucide-react';
import { api } from '../lib/api';

interface UploadSectionProps {
    userId: number;
    category: string;
    onUploadComplete: () => void;
}

export default function UploadSection({ userId, category, onUploadComplete }: UploadSectionProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const isWishlist = category === 'wishlist';

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId.toString());
        formData.append('category', category);

        try {
            await api.post('/wardrobe/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadComplete();
        } catch (err: unknown) {
            console.error(err);
            setError("Erreur lors de l'upload. L'IA n'a peut-être pas pu analyser l'image.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <div className={`w-full p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md ${isWishlist
                ? 'bg-gradient-to-r from-purple-50 to-pink-50 border-purple-100'
                : 'bg-white border-gray-100'
            }`}>
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${isWishlist ? 'bg-purple-100' : 'bg-black/5'}`}>
                    {isWishlist
                        ? <Sparkles className="w-8 h-8 text-purple-600" />
                        : <Shirt className="w-8 h-8 text-black" />
                    }
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">
                        {isWishlist ? 'Ajouter une inspiration' : 'Ajouter un vêtement'}
                    </h3>
                    <p className="text-sm text-gray-500">
                        {isWishlist
                            ? 'Uploadez un look qui vous plaît, on trouve les pièces pour vous.'
                            : 'Prenez une photo, l\'IA s\'occupe du reste.'
                        }
                    </p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                <label
                    htmlFor={`upload-${category}`}
                    className={`
                        cursor-pointer flex items-center gap-2 px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl transition-all transform active:scale-95
                        ${uploading ? 'opacity-75 cursor-not-allowed' : ''}
                        ${isWishlist
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700'
                            : 'bg-black text-white hover:bg-gray-900'
                        }
                    `}
                >
                    {uploading ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            <span>Analyse IA en cours...</span>
                        </>
                    ) : (
                        <>
                            <Upload className="w-5 h-5" />
                            <span>{isWishlist ? 'Charger un look' : 'Charger une photo'}</span>
                        </>
                    )}
                    <input
                        id={`upload-${category}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileChange}
                        disabled={uploading}
                        ref={fileInputRef}
                    />
                </label>
                {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
            </div>
        </div>
    );
}
