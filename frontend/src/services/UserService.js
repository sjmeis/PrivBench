/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

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