import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const axiosInstance = axios.create({
        baseURL: 'http://localhost:5000',
        withCredentials: true, // Automatically send cookies for cross-origin requests
    });

    const checkAuth = async () => {
        try {
            const response = await axiosInstance.get('/user');
            setUser(response.data.user);
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

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
        logout
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
