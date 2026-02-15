import { useState, useRef } from 'react';
import { Upload, Shirt, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

interface UploadSectionProps {
    userId: number;
    onUploadComplete: () => void;
}

export default function UploadSection({ userId, onUploadComplete }: UploadSectionProps) {
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('user_id', userId.toString());

        try {
            await api.post('/wardrobe/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadComplete();
        } catch (err: any) {
            console.error(err);
            setError("Erreur lors de l'upload. L'IA n'a peut-être pas pu analyser l'image.");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = ''; // Reset input
            }
        }
    };

    return (
        <div className="w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6 transition-all hover:shadow-md">
            <div className="flex items-center gap-4">
                <div className="bg-black/5 p-3 rounded-xl">
                    <Shirt className="w-8 h-8 text-black" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-gray-900">Ajouter un vêtement</h3>
                    <p className="text-sm text-gray-500">Prenez une photo, l'IA s'occupe du reste.</p>
                </div>
            </div>

            <div className="flex flex-col items-end gap-2 w-full md:w-auto">
                <label
                    htmlFor="clothing-upload"
                    className={`
            cursor-pointer flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full font-medium shadow-lg hover:shadow-xl hover:bg-gray-900 transition-all transform active:scale-95
            ${uploading ? 'opacity-75 cursor-not-allowed' : ''}
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
                            <span>Charger une photo</span>
                        </>
                    )}
                    <input
                        id="clothing-upload"
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
