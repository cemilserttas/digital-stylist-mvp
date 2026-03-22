'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, ShoppingBag, MapPin, Plus, Loader2, Truck, CreditCard } from 'lucide-react';
import { getAddresses, createAddress, checkoutListing } from '@/lib/api';
import type { MarketplaceListing, ShippingAddress } from '@/lib/types';

export interface CheckoutModalProps {
  listing: MarketplaceListing;
  userId: number;
  onClose: () => void;
  onSuccess: (orderId: number) => void;
}

export default function CheckoutModal({ listing, userId, onClose, onSuccess }: CheckoutModalProps) {
  const [addresses, setAddresses] = useState<ShippingAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Address form
  const [fullName, setFullName] = useState('');
  const [line1, setLine1] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [phone, setPhone] = useState('');

  const priceEur = (listing.price_cents / 100).toFixed(2);
  const shippingCents = 499;
  const totalCents = listing.price_cents + shippingCents;
  const totalEur = (totalCents / 100).toFixed(2);

  useEffect(() => {
    loadAddresses();
  }, [userId]);

  const loadAddresses = async () => {
    setLoading(true);
    try {
      const data = await getAddresses(userId);
      setAddresses(data);
      const defaultAddr = data.find((a: ShippingAddress) => a.is_default);
      if (defaultAddr) setSelectedAddressId(defaultAddr.id);
      else if (data.length > 0) setSelectedAddressId(data[0].id);
      else setShowAddressForm(true);
    } catch {
      setError('Erreur lors du chargement des adresses');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAddress = async () => {
    if (!fullName.trim() || !line1.trim() || !postalCode.trim() || !city.trim()) {
      setError('Remplissez tous les champs obligatoires');
      return;
    }
    setError(null);
    try {
      const addr = await createAddress(userId, {
        full_name: fullName.trim(),
        line1: line1.trim(),
        postal_code: postalCode.trim(),
        city: city.trim(),
        phone: phone.trim() || undefined,
        is_default: addresses.length === 0,
      });
      setAddresses((prev) => [...prev, addr]);
      setSelectedAddressId(addr.id);
      setShowAddressForm(false);
      setFullName(''); setLine1(''); setPostalCode(''); setCity(''); setPhone('');
    } catch {
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handlePay = async () => {
    if (!selectedAddressId) {
      setError('Sélectionnez une adresse de livraison');
      return;
    }
    setPaying(true);
    setError(null);
    try {
      const result = await checkoutListing(listing.id);
      if (result.checkout_url) {
        window.location.href = result.checkout_url;
      } else {
        // Dev mode — order created directly
        onSuccess(result.order_id);
        onClose();
      }
    } catch (err: unknown) {
      const detail = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail;
      setError(detail || 'Erreur lors du paiement');
      setPaying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xl flex items-end sm:items-center justify-center" onClick={onClose}>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-gray-900 w-full sm:max-w-md sm:rounded-2xl max-h-[90vh] overflow-y-auto border border-white/10"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gray-900/90 backdrop-blur-xl border-b border-white/10 px-5 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">
            <CreditCard className="w-5 h-5 inline mr-2 text-purple-400" />
            Paiement
          </h2>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Order summary */}
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                {listing.image_urls?.[0] && (
                  <img src={listing.image_urls[0]} alt="" className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{listing.title}</p>
                {listing.brand && <p className="text-xs text-gray-400">{listing.brand}</p>}
              </div>
              <p className="font-bold text-white">{priceEur} €</p>
            </div>
            <div className="border-t border-white/10 pt-2 space-y-1 text-xs">
              <div className="flex justify-between text-gray-400">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> Livraison</span>
                <span>4,99 €</span>
              </div>
              <div className="flex justify-between font-bold text-white text-sm">
                <span>Total</span>
                <span>{totalEur} €</span>
              </div>
            </div>
          </div>

          {/* Shipping address */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Adresse de livraison
            </h3>

            {loading ? (
              <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-500 mx-auto" /></div>
            ) : (
              <>
                {addresses.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full text-left p-3 rounded-xl border mb-2 transition-colors ${
                      selectedAddressId === addr.id
                        ? 'border-purple-500 bg-purple-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    }`}
                  >
                    <p className="text-sm font-bold text-white">{addr.full_name}</p>
                    <p className="text-xs text-gray-400">{addr.line1}</p>
                    <p className="text-xs text-gray-400">{addr.postal_code} {addr.city}</p>
                  </button>
                ))}

                {showAddressForm ? (
                  <div className="space-y-3 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <input
                      value={fullName} onChange={(e) => setFullName(e.target.value)}
                      placeholder="Nom complet *"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500/50 focus:outline-none"
                    />
                    <input
                      value={line1} onChange={(e) => setLine1(e.target.value)}
                      placeholder="Adresse *"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500/50 focus:outline-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="Code postal *"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500/50 focus:outline-none"
                      />
                      <input
                        value={city} onChange={(e) => setCity(e.target.value)}
                        placeholder="Ville *"
                        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500/50 focus:outline-none"
                      />
                    </div>
                    <input
                      value={phone} onChange={(e) => setPhone(e.target.value)}
                      placeholder="Téléphone"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:border-purple-500/50 focus:outline-none"
                    />
                    <div className="flex gap-2">
                      <button onClick={handleAddAddress} className="flex-1 py-2 bg-purple-500/20 text-purple-300 text-sm font-bold rounded-lg hover:bg-purple-500/30">
                        Sauvegarder
                      </button>
                      <button onClick={() => setShowAddressForm(false)} className="px-4 py-2 bg-white/5 text-gray-400 text-sm rounded-lg hover:bg-white/10">
                        Annuler
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddressForm(true)}
                    className="w-full py-2.5 border border-dashed border-white/20 rounded-xl text-sm text-gray-400 hover:text-gray-300 hover:border-white/30 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Ajouter une adresse
                  </button>
                )}
              </>
            )}
          </div>

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}

          {/* Pay button */}
          <button
            onClick={handlePay}
            disabled={paying || !selectedAddressId}
            className="w-full py-3.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {paying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
            {paying ? 'Redirection...' : `Payer ${totalEur} €`}
          </button>

          <p className="text-center text-[10px] text-gray-600">
            Paiement sécurisé par Stripe. Livraison sous 3-7 jours ouvrés.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
