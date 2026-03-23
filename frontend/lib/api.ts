import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('stylist_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// On 401, clear session and reload
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && typeof window !== 'undefined') {
            localStorage.removeItem('stylist_token');
            localStorage.removeItem('stylist_user');
            localStorage.removeItem('stylist_suggestions');
            localStorage.removeItem('stylist_greeting');
            window.location.reload();
        }
        return Promise.reject(error);
    }
);

export const createUser = async (data: {
    email: string; prenom: string; morphologie: string; genre: string;
    age: number; password: string; referral_code?: string;
}) => {
    const response = await api.post('/users/create', data);
    return response.data;
};

export const getReferralInfo = async (userId: number) => {
    const response = await api.get(`/users/${userId}/referral`);
    return response.data;
};

export const loginUser = async (email: string, password: string, remember_me: boolean = true) => {
    const response = await api.post('/users/login', { email, password, remember_me });
    return response.data;
};

export const uploadClothing = async (file: File, userId: number, category: string = 'wardrobe') => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId.toString());
    formData.append('category', category);

    const response = await api.post('/wardrobe/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getWardrobe = async (userId: number, category?: string) => {
    const params = category ? `?category=${category}` : '';
    const response = await api.get(`/wardrobe/${userId}${params}`);
    return response.data;
};

export const deleteClothing = async (itemId: number) => {
    const response = await api.delete(`/wardrobe/item/${itemId}`);
    return response.data;
};

export const updateClothing = async (itemId: number, data: { type: string; couleur: string; saison: string }) => {
    const formData = new FormData();
    formData.append('type', data.type);
    formData.append('couleur', data.couleur);
    formData.append('saison', data.saison);

    const response = await api.put(`/wardrobe/item/${itemId}`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getDailySuggestions = async (userId: number, weatherData: {
    temperature: number;
    description: string;
    ville: string;
}) => {
    const response = await api.post(`/suggestions/${userId}`, weatherData);
    return response.data;
};

export const getUser = async (userId: number) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
};

export const updateUser = async (userId: number, data: Record<string, unknown>) => {
    const response = await api.put(`/users/${userId}`, data);
    return response.data;
};

export const deleteUser = async (userId: number) => {
    const response = await api.delete(`/users/${userId}`);
    return response.data;
};

export const saveClick = async (userId: number, data: {
    product_name: string;
    marque: string;
    prix: number;
    url: string;
}) => {
    const response = await api.post(`/users/${userId}/clicks`, data);
    return response.data;
};

export const getClicks = async (userId: number) => {
    const response = await api.get(`/users/${userId}/clicks`);
    return response.data;
};

export const clearClicks = async (userId: number) => {
    const response = await api.delete(`/users/${userId}/clicks`);
    return response.data;
};

export const chatWithStylist = async (userId: number, message: string, history: Array<{ role: string; content: string }>) => {
    const response = await api.post(`/chat/${userId}`, { message, history });
    return response.data;
};

export const getOutfitPlans = async (userId: number, start?: string, end?: string) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start);
    if (end) params.append('end', end);
    const response = await api.get(`/outfit-calendar/${userId}?${params.toString()}`);
    return response.data;
};

export const saveOutfitPlan = async (userId: number, plan: {
    date: string;
    item_ids: number[];
    occasion?: string;
    notes?: string;
}) => {
    const response = await api.post(`/outfit-calendar/${userId}`, plan);
    return response.data;
};

export const deleteOutfitPlan = async (planId: number) => {
    const response = await api.delete(`/outfit-calendar/${planId}`);
    return response.data;
};

export const getWardrobeAnalytics = async (userId: number) => {
    const response = await api.get(`/wardrobe/${userId}/analytics`);
    return response.data;
};

export const getWardrobeScore = async (userId: number) => {
    const response = await api.get(`/wardrobe/${userId}/score`);
    return response.data;
};

export const createCheckoutSession = async (userId: number, plan: 'monthly' | 'yearly' = 'monthly') => {
    const response = await api.post(`/billing/${userId}/checkout`, { plan });
    return response.data as { checkout_url: string; session_id: string };
};

export const registerFcmToken = async (userId: number, fcmToken: string, city?: string) => {
    const response = await api.put(`/push/${userId}/token`, { fcm_token: fcmToken, city });
    return response.data;
};

export const unregisterFcmToken = async (userId: number) => {
    const response = await api.delete(`/push/${userId}/token`);
    return response.data;
};

export const getImageUrl = (path: string) => {
    // CDN paths are already full URLs (https://...)
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const normalizedPath = path.replace(/\\/g, '/');
    return `${API_URL}/${normalizedPath}`;
};

// ── Marketplace Listings ───────────────────────────────────────────────────

export const getListings = async (params?: {
    category_type?: string; color?: string; season?: string; size?: string;
    brand?: string; condition?: string; price_min?: number; price_max?: number;
    sort?: string; limit?: number; offset?: number;
}) => {
    const query = new URLSearchParams();
    if (params) {
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null && v !== '') query.append(k, String(v));
        });
    }
    const response = await api.get(`/shop/listings?${query.toString()}`);
    return response.data;
};

export const getListing = async (listingId: number) => {
    const response = await api.get(`/shop/listings/${listingId}`);
    return response.data;
};

export const searchListings = async (q: string) => {
    const response = await api.get(`/shop/search?q=${encodeURIComponent(q)}`);
    return response.data;
};

export const createListing = async (data: {
    clothing_item_id?: number | null; title: string; description?: string;
    price_cents: number; condition?: string; size?: string; brand?: string;
    category_type?: string; color?: string; season?: string; image_urls?: string[];
}) => {
    const response = await api.post('/shop/listings', data);
    return response.data;
};

export const createListingFromWardrobe = async (itemId: number) => {
    const response = await api.post(`/shop/listings/from-wardrobe/${itemId}`);
    return response.data;
};

export const updateListing = async (listingId: number, data: Record<string, unknown>) => {
    const response = await api.put(`/shop/listings/${listingId}`, data);
    return response.data;
};

export const cancelListing = async (listingId: number) => {
    const response = await api.delete(`/shop/listings/${listingId}`);
    return response.data;
};

export const getMyListings = async () => {
    const response = await api.get('/shop/my-listings');
    return response.data;
};

export const getAiPriceSuggestion = async (listingId: number) => {
    const response = await api.post(`/shop/listings/${listingId}/ai-price`);
    return response.data;
};

// ── Orders ─────────────────────────────────────────────────────────────────

export const checkoutListing = async (listingId: number) => {
    const response = await api.post(`/orders/checkout/${listingId}`);
    return response.data as { order_id: number; checkout_url: string | null; dev_mode?: boolean };
};

export const getMyPurchases = async () => {
    const response = await api.get('/orders/my-purchases');
    return response.data;
};

export const getMySales = async () => {
    const response = await api.get('/orders/my-sales');
    return response.data;
};

export const getOrder = async (orderId: number) => {
    const response = await api.get(`/orders/${orderId}`);
    return response.data;
};

export const shipOrder = async (orderId: number, data: { tracking_number: string; tracking_carrier: string }) => {
    const response = await api.put(`/orders/${orderId}/ship`, data);
    return response.data;
};

export const confirmDelivery = async (orderId: number) => {
    const response = await api.put(`/orders/${orderId}/delivered`);
    return response.data;
};

// ── Shipping Addresses ─────────────────────────────────────────────────────

export const getAddresses = async (userId: number) => {
    const response = await api.get(`/addresses/${userId}`);
    return response.data;
};

export const createAddress = async (userId: number, data: {
    label?: string; full_name: string; line1: string; line2?: string;
    postal_code: string; city: string; country?: string; phone?: string; is_default?: boolean;
}) => {
    const response = await api.post(`/addresses/${userId}`, data);
    return response.data;
};

export const deleteAddress = async (addressId: number) => {
    const response = await api.delete(`/addresses/${addressId}`);
    return response.data;
};
