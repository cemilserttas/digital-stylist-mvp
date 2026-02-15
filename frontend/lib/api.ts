import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
    baseURL: API_URL,
});

export const createUser = async (prenom: string, morphologie: string) => {
    // Ensure morphology matches backend Enum: TRIANGLE, OVALE, RECTANGLE, SABLIER, TRAPEZE
    const response = await api.post('/users/create', { prenom, morphologie });
    return response.data;
};

export const uploadClothing = async (file: File, userId: number) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId.toString());

    const response = await api.post('/wardrobe/upload', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
    return response.data;
};

export const getWardrobe = async (userId: number) => {
    const response = await api.get(`/wardrobe/${userId}`);
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

export const getImageUrl = (path: string) => {
    const normalizedPath = path.replace(/\\/g, '/');
    return `${API_URL}/${normalizedPath}`;
};
