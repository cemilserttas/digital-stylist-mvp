import { useState } from 'react';
import { User, UserCircle } from 'lucide-react';
import { api } from '../lib/api';

const MORPHOLOGIES = [
    "TRIANGLE",
    "OVALE",
    "RECTANGLE",
    "SABLIER",
    "TRAPEZE"
];

interface UserFormProps {
    onUserCreated: (user: { id: number; prenom: string; morphologie: string }) => void;
}

export default function UserForm({ onUserCreated }: UserFormProps) {
    const [prenom, setPrenom] = useState('');
    const [morphologie, setMorphologie] = useState(MORPHOLOGIES[1]); // Default to OVALE
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const response = await api.post('/users/create', { prenom, morphologie });
            onUserCreated(response.data);
        } catch (err: any) {
            console.error(err);
            setError("Erreur lors de la création du profil. Vérifiez la connexion au backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <div className="flex items-center gap-3 mb-6">
                <UserCircle className="w-8 h-8 text-black" />
                <h2 className="text-2xl font-bold text-gray-900">Créez votre profil</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="prenom" className="block text-sm font-medium text-gray-700 mb-1">
                        Prénom
                    </label>
                    <input
                        type="text"
                        id="prenom"
                        required
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all"
                        value={prenom}
                        onChange={(e) => setPrenom(e.target.value)}
                        placeholder="Ex: Emma"
                    />
                </div>

                <div>
                    <label htmlFor="morphologie" className="block text-sm font-medium text-gray-700 mb-1">
                        Morphologie
                    </label>
                    <select
                        id="morphologie"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent outline-none transition-all bg-white"
                        value={morphologie}
                        onChange={(e) => setMorphologie(e.target.value)}
                    >
                        {MORPHOLOGIES.map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                    </select>
                </div>

                {error && (
                    <p className="text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-black text-white py-3 px-6 rounded-lg font-medium hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 disabled:cursor-not-allowed transition-all transform active:scale-95"
                >
                    {loading ? (
                        <span className="flex items-center justify-center gap-2">
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Création...
                        </span>
                    ) : (
                        'Commencer'
                    )}
                </button>
            </form>
        </div>
    );
}
