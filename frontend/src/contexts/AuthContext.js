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

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const AuthContext = createContext(null);


const axiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // Automatically send cookies for cross-origin requests
});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = useCallback(async () => {
        try {
          const response = await axiosInstance.get('/user');
          setUser(response.data.user);
        } catch (error) {
          console.error('Auth check failed:', error);
          setUser(null);
        } finally {
          setLoading(false);
        }
      }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const register = async (formData) => {
        try {
            const response = await axiosInstance.post('/register', formData);

            if (response.data.success) {
                await checkAuth();
            }

            return response.data;
        } catch (error) {
            console.error('Registration failed:', error);
            throw new Error(error.response?.data?.message || 'Registration failed');
        }
    };

    const login = async (formData) => {
        try {
            const response = await axiosInstance.post('/login', formData);

            if (response.data.success) {
                await checkAuth(); // Update the user state on successful login
            }

            return response.data;
        } catch (error) {
            console.error('Login failed:', error);
            throw new Error(error.response?.data?.message || 'Login failed');
        }
    };

    const logout = async () => {
        try {
            await axiosInstance.post('/logout');
            setUser(null);
        } catch (error) {
            console.error('Logout failed:', error);
            throw new Error(error.response?.data?.message || 'Logout failed');
        }
    };

    const value = {
        user,
        loading,
        register,
        login,
        logout,
        checkAuth,
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const useCurrentUser = () => {
    return useContext(AuthContext);
};
