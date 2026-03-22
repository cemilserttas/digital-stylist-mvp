'use client';

import { useState, useEffect } from 'react';
import { Package, Truck, CheckCircle, Clock, Loader2, ChevronRight } from 'lucide-react';
import { getMyPurchases, getMySales, shipOrder, confirmDelivery, getImageUrl } from '@/lib/api';
import type { MarketplaceOrder } from '@/lib/types';

export interface OrdersSectionProps {
  userId: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  pending: { label: 'En attente', color: 'text-amber-400 bg-amber-500/10', icon: Clock },
  shipped: { label: 'Expédié', color: 'text-blue-400 bg-blue-500/10', icon: Truck },
  delivered: { label: 'Livré', color: 'text-green-400 bg-green-500/10', icon: CheckCircle },
  completed: { label: 'Terminé', color: 'text-gray-400 bg-gray-500/10', icon: CheckCircle },
  cancelled: { label: 'Annulé', color: 'text-red-400 bg-red-500/10', icon: Package },
};

export default function OrdersSection({ userId }: OrdersSectionProps) {
  const [tab, setTab] = useState<'purchases' | 'sales'>('purchases');
  const [purchases, setPurchases] = useState<MarketplaceOrder[]>([]);
  const [sales, setSales] = useState<MarketplaceOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Ship modal
  const [shipModalOrder, setShipModalOrder] = useState<number | null>(null);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingCarrier, setTrackingCarrier] = useState('Colissimo');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([getMyPurchases(), getMySales()]);
      setPurchases(p);
      setSales(s);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleShip = async (orderId: number) => {
    if (!trackingNumber.trim()) return;
    setActionLoading(orderId);
    try {
      await shipOrder(orderId, { tracking_number: trackingNumber.trim(), tracking_carrier: trackingCarrier });
      setShipModalOrder(null);
      setTrackingNumber('');
      await loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelivery = async (orderId: number) => {
    setActionLoading(orderId);
    try {
      await confirmDelivery(orderId);
      await loadOrders();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
    }
  };

  const orders = tab === 'purchases' ? purchases : sales;

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-gray-500 mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Tab toggle */}
      <div className="flex bg-white/5 rounded-xl p-1">
        <button
          onClick={() => setTab('purchases')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
            tab === 'purchases' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Mes achats ({purchases.length})
        </button>
        <button
          onClick={() => setTab('sales')}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${
            tab === 'sales' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          Mes ventes ({sales.length})
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-12 bg-white/5 rounded-2xl border border-dashed border-white/10">
          <Package className="w-10 h-10 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm font-medium">
            {tab === 'purchases' ? 'Aucun achat pour le moment' : 'Aucune vente pour le moment'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const priceEur = (order.amount_cents / 100).toFixed(2);

            return (
              <div key={order.id} className="bg-white/5 border border-white/10 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  {/* Image */}
                  <div className="w-14 h-14 rounded-lg bg-gray-800 overflow-hidden shrink-0">
                    {order.listing_image && (
                      <img src={getImageUrl(order.listing_image)} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{order.listing_title || `Commande #${order.id}`}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${cfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {cfg.label}
                      </span>
                      {tab === 'purchases' && order.seller_prenom && (
                        <span className="text-[10px] text-gray-500">de {order.seller_prenom}</span>
                      )}
                      {tab === 'sales' && order.buyer_prenom && (
                        <span className="text-[10px] text-gray-500">par {order.buyer_prenom}</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-white">{priceEur} €</p>
                    {tab === 'sales' && (
                      <p className="text-[10px] text-green-400">+{(order.seller_payout_cents / 100).toFixed(2)} €</p>
                    )}
                  </div>
                </div>

                {/* Tracking */}
                {order.tracking_number && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-400 bg-white/5 rounded-lg p-2">
                    <Truck className="w-3.5 h-3.5" />
                    {order.tracking_carrier}: {order.tracking_number}
                  </div>
                )}

                {/* Actions */}
                {tab === 'sales' && order.status === 'pending' && (
                  <div className="mt-3">
                    {shipModalOrder === order.id ? (
                      <div className="space-y-2">
                        <input
                          value={trackingNumber}
                          onChange={(e) => setTrackingNumber(e.target.value)}
                          placeholder="Numéro de suivi"
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-purple-500/50"
                        />
                        <select
                          value={trackingCarrier}
                          onChange={(e) => setTrackingCarrier(e.target.value)}
                          className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none"
                        >
                          <option value="Colissimo">Colissimo</option>
                          <option value="Mondial Relay">Mondial Relay</option>
                          <option value="Chronopost">Chronopost</option>
                          <option value="DPD">DPD</option>
                          <option value="Autre">Autre</option>
                        </select>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShip(order.id)}
                            disabled={actionLoading === order.id}
                            className="flex-1 py-2 bg-blue-500/20 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-500/30 disabled:opacity-50"
                          >
                            {actionLoading === order.id ? 'Envoi...' : 'Confirmer l\'envoi'}
                          </button>
                          <button
                            onClick={() => setShipModalOrder(null)}
                            className="px-3 py-2 bg-white/5 text-gray-400 text-xs rounded-lg hover:bg-white/10"
                          >
                            Annuler
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShipModalOrder(order.id)}
                        className="w-full py-2 bg-blue-500/10 text-blue-300 text-xs font-bold rounded-lg hover:bg-blue-500/20 flex items-center justify-center gap-2"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        Marquer comme expédié
                      </button>
                    )}
                  </div>
                )}

                {tab === 'purchases' && order.status === 'shipped' && (
                  <button
                    onClick={() => handleConfirmDelivery(order.id)}
                    disabled={actionLoading === order.id}
                    className="mt-3 w-full py-2 bg-green-500/10 text-green-300 text-xs font-bold rounded-lg hover:bg-green-500/20 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {actionLoading === order.id ? 'Confirmation...' : 'Confirmer la réception'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
