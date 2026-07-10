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

import { useState } from 'react';
import { useNavigate, useLocation, Link as RouterLink } from 'react-router-dom';
import {
    Box,
    Typography,
    FormControl,
    FormLabel,
    Input,
    Button,
    Alert,
    Stack,
    Divider,
    Link
} from "@mui/joy";
import {Login as LoginIcon, PersonAdd} from "@mui/icons-material";
import { useAuth } from '../contexts/AuthContext';
import MainLayout from "../components/layout/MainLayout";
import { useSnackbar } from '../contexts/SnackbarProvider';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Login = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });
    const [error, setError] = useState('');
    const [showResend, setShowResend] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const location = useLocation();
    const [showVerifiedAlert, setShowVerifiedAlert] = useState(location.state?.verified || false);
    const { login } = useAuth();

    const { showSnackbar } = useSnackbar();

    const from = location.state?.from?.pathname || "/";

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        setShowResend(false);

        const trimmedData = Object.keys(formData).reduce((acc, key) => {
            acc[key] = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
            return acc;
        }, {});

        try {
            await login(trimmedData);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
            if (err.message.toLowerCase().includes("verify your email")) {
                setShowResend(true);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendFromLogin = async () => {
        if (!formData.username) {
            setError("Please enter your email address first so we know where to send the link.");
            return;
        }

        setIsLoading(true); // Reusing your existing loading state
        try {
            await axios.post(`${API_BASE_URL}/resend-verification`, { 
                mailAddress: formData.username 
            });
            
            setError("");
            setShowResend(false);
            showSnackbar("Verification link resent! Please check your inbox.", "success");
        } catch (err) {
            setError(err.response?.data?.message || "Failed to resend link.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <MainLayout>
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: 400,
                mx: 'auto',
                my: 4,
                py: 3,
                px: 2,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 'sm',
                mt: "auto",
                overflow: "hidden",
            }}
        >
            <Typography level="h4" component="h1" sx={{ mb: 2 }}>
                Login to PrivBench
            </Typography>

            {showVerifiedAlert && (
                <Alert color="success" variant="soft" sx={{ mb: 2, width: '100%' }}>
                    Account verified successfully! You can now log in.
                </Alert>
            )}

            {error && (
                <Alert 
                    color="danger" 
                    variant="soft" 
                    sx={{ mb: 2, width: '100%', flexDirection: 'column', alignItems: 'flex-start' }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography level="body-sm" color="danger">{error}</Typography>
                    </Box>
                    
                    {showResend && (
                        <Button 
                            variant="link" 
                            size="sm" 
                            onClick={handleResendFromLogin}
                            sx={{ p: 0, mt: 1, textDecoration: 'underline' }}
                        >
                            Click here to resend verification email.
                        </Button>
                    )}
                </Alert>
            )}

            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
                <Stack spacing={2} sx={{ width: '100%' }}>
                    <FormControl required>
                        <FormLabel>Username</FormLabel>
                        <Input
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleInputChange}
                            autoComplete="username"
                        />
                    </FormControl>

                    <FormControl required>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <FormLabel>Password</FormLabel>
                        <Link
                            component={RouterLink}
                            to="/forgot-password"
                            level="body-xs"
                            underline="hover"
                            sx={{ fontWeight: 'md' }}
                            >
                            Forgot password?
                        </Link>
                        </Box>
                        <Input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            autoComplete="current-password"
                        />
                    </FormControl>

                    <Button
                        type="submit"
                        loading={isLoading}
                        loadingPosition="center"
                        endDecorator={<LoginIcon />}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </Button>

                    <Divider>or</Divider>

                    <Button
                        variant="outlined"
                        color="neutral"
                        onClick={() => navigate('/register')}
                        endDecorator={<PersonAdd />}
                    >
                        Create new account
                    </Button>
                </Stack>
            </form>
        </Box>
        </MainLayout>
    );
};

export default Login;