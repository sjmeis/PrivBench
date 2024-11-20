import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const response = await fetch('http://localhost:5000/user', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                setUser(data);
            } else {
                setUser(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const register = async (username, password) => {
        try {
            const response = await fetch('http://localhost:5000/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            // After successful registration, automatically log in
            if (data.success) {
                await checkAuth();
            }

            return data;
        } catch (error) {
            throw error;
        }
    };

    const login = async (username, password) => {
        try {
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            if (data.success) {
                await checkAuth();
            }

            return data;
        } catch (error) {
            throw error;
        }
    };

    const logout = async () => {
        try {
            const response = await fetch('http://localhost:5000/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                setUser(null);
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    };

    const value = {
        user,
        loading,
        register,
        login,
        logout,
        isAuthenticated: !!user
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

export default AuthProvider;