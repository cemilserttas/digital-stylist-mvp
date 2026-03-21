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

export const createUser = async (data: { prenom: string; morphologie: string; genre: string; age: number; password?: string; referral_code?: string }) => {
    const response = await api.post('/users/create', data);
    return response.data;
};

export const getReferralInfo = async (userId: number) => {
    const response = await api.get(`/users/${userId}/referral`);
    return response.data;
};

export const loginUser = async (prenom: string, password: string) => {
    const response = await api.post('/users/login', { prenom, password });
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
