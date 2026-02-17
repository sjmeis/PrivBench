import axios from 'axios';
import { API_BASE_URL } from '../config';


export const updateUser = async (userData) => {
    try {
        const response = await axios.put(`${API_BASE_URL}/user/update`, userData, {
            withCredentials: true,
        });

        return response.data;
    } catch (error) {
        if (error.response) {
            console.error('Error response:', error.response);
            throw new Error(error.response.data.error || 'Failed to update user');
        } else if (error.request) {
            console.error('Error request:', error.request);
            throw new Error('No response received from the server');
        } else {
            console.error('Error message:', error.message);
            throw new Error(error.message);
        }
    }
};

export const uploadProfilePicture = async (file) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await axios.post(`${API_BASE_URL}/user/profile-picture`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to upload image");
    }
};

export const deleteProfilePicture = async () => {
    try {
        const response = await axios.delete(`${API_BASE_URL}/user/profile-picture`);
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to delete image");
    }
};

export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/user/change-password`, {
            currentPassword,
            newPassword
        });
        return response.data;
    } catch (error) {
        throw new Error(error.response?.data?.message || "Failed to update password");
    }
};