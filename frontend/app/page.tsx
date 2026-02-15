'use client';

import { useState, useEffect } from 'react';
import UserForm from '@/components/UserForm';
import UploadSection from '@/components/UploadSection';
import WardrobeGallery from '@/components/WardrobeGallery';
import { getWardrobe } from '@/lib/api';

interface User {
  id: number;
  prenom: string;
  morphologie: string;
}

interface ClothingItem {
  id: number;
  type: string;
  couleur: string;
  saison: string;
  tags_ia: string;
  image_path: string;
}

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [clothes, setClothes] = useState<ClothingItem[]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(false);

  // Load user from localStorage on mount so we don't lose session on refresh
  useEffect(() => {
    const storedUser = localStorage.getItem('stylist_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const fetchClothes = async () => {
    if (!user) return;
    setLoadingWardrobe(true);
    try {
      const items = await getWardrobe(user.id);
      setClothes(items);
    } catch (err) {
      console.error("Failed to fetch wardrobe", err);
    } finally {
      setLoadingWardrobe(false);
    }
  };

  // Fetch clothes when user is set
  useEffect(() => {
    if (user) {
      localStorage.setItem('stylist_user', JSON.stringify(user));
      fetchClothes();
    }
  }, [user]);

  const handleUserCreated = (newUser: User) => {
    setUser(newUser);
  };

  const handleUploadComplete = () => {
    fetchClothes();
  };

  const handleLogout = () => {
    localStorage.removeItem('stylist_user');
    setUser(null);
    setClothes([]);
  };

  if (!user) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans pattern-grid-lg">
        <UserForm onUserCreated={handleUserCreated} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 font-sans text-gray-900 pb-20">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight text-gray-900">
              DIGITAL<span className="text-gray-400">STYLIST</span>.
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-bold text-gray-900">{user.prenom}</p>
              <p className="text-xs text-gray-500">{user.morphologie}</p>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs font-medium text-gray-400 hover:text-black transition-colors"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Upload Section */}
        <section>
          <UploadSection userId={user.id} onUploadComplete={handleUploadComplete} />
        </section>

        {/* Gallery Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Ma Garde-Robe</h2>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-bold">
              {clothes.length} pièces
            </span>
          </div>
          <WardrobeGallery items={clothes} loading={loadingWardrobe} onItemChanged={fetchClothes} />
        </section>
      </div>
    </main>
  );
}
