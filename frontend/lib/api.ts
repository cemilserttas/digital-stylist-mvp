import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

export const createUser = async (data: { prenom: string; morphologie: string; genre: string; age: number }) => {
    const response = await api.post('/users/create', data);
    return response.data;
};

export const loginUser = async (prenom: string) => {
    const response = await api.post('/users/login', { prenom });
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

export const getImageUrl = (path: string) => {
    const normalizedPath = path.replace(/\\/g, '/');
    return `${API_URL}/${normalizedPath}`;
};
