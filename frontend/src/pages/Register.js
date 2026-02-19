import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
    Box,
    Typography,
    FormControl,
    FormLabel,
    Input,
    Button,
    Alert,
    Stack,
    Divider
} from "@mui/joy";
import { useAuth } from '../contexts/AuthContext';
import {Login, PersonAdd} from "@mui/icons-material";
import MainLayout from "../components/layout/MainLayout";
import { FormHelperText, IconButton } from '@mui/joy';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import { useSnackbar } from '../contexts/SnackbarProvider';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Register = () => {
    const [formData, setFormData] = useState({
        username: '',
        password: '',
        confirmPassword: '',
        mailAddress: '',
        researchInstitute: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const [isResending, setIsResending] = useState(false);
    const { showSnackbar } = useSnackbar();

    const isPasswordSecure = (pwd) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);
    
    const navigate = useNavigate();
    const location = useLocation();
    const { register } = useAuth();
    
    const from = location.state?.from?.pathname || "/";

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const validateForm = () => {
        if (!isPasswordSecure(formData.password)) {
            setError("Password must be at least 8 characters long and include both letters and numbers.");
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match. Please try again.");
            return false;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long.");
            return false;
        }
        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters long.");
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        const trimmedData = Object.keys(formData).reduce((acc, key) => {
            acc[key] = typeof formData[key] === 'string' ? formData[key].trim() : formData[key];
            return acc;
        }, {});

        setIsLoading(true);

        try {
            const { confirmPassword, ...payload } = formData;
            await register(payload);
            setIsSubmitted(true); 
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    if (isSubmitted) {
        const handleResend = async () => {
            setIsResending(true);
            try {
                await axios.post(`${API_BASE_URL}/resend-verification`, { 
                    mailAddress: formData.mailAddress 
                });
                showSnackbar("New verification link sent!", "success");
            } catch (err) {
                showSnackbar(err.response?.data?.message || "Failed to resend", "error");
            } finally {
                setIsResending(false);
            }
        };

        return (
            <MainLayout>
                <Box sx={{ maxWidth: 400, mx: 'auto', my: 8, textAlign: 'center', p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 'sm' }}>
                    <Typography level="h4" mb={2}>Check your email!</Typography>
                    <Typography level="body-md" mb={3}>
                        We've sent a confirmation link to <strong>{formData.mailAddress}</strong>. 
                        Please click the link to verify your account.
                    </Typography>
                    <Stack spacing={1}>
                        <Button variant="outlined" fullWidth onClick={() => navigate('/login')}>
                            Back to Login
                        </Button>
                        <Button 
                            variant="plain" 
                            size="sm" 
                            loading={isResending} 
                            onClick={handleResend}
                        >
                            Didn't receive an email? Click to resend link.
                        </Button>
                    </Stack>
                </Box>
            </MainLayout>
        );
    }

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
                overflow: "hidden",
            }}
        >
            <Typography level="h4" component="h1" sx={{ mb: 2 }}>
                Create Account
            </Typography>

            {error && (
                <Alert
                    variant="soft"
                    color="danger"
                    sx={{ mb: 2, width: '100%' }}
                >
                    {error}
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
                        <FormLabel>Mail Address</FormLabel>
                        <Input
                            name="mailAddress"
                            type="mail"
                            value={formData.mailAddress}
                            onChange={handleInputChange}
                            autoComplete="username"
                        />
                    </FormControl>
                    <FormControl>
                        <FormLabel>Research Institute</FormLabel>
                        <Input
                            name="researchInstitute"
                            type="text"
                            value={formData.researchInstitute}
                            onChange={handleInputChange}
                            autoComplete="username"
                        />
                    </FormControl>
                    <FormControl required error={formData.password.length > 0 && !isPasswordSecure(formData.password)}>
                        <FormLabel>Password</FormLabel>
                        <Input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            placeholder="••••••••"
                            onChange={handleInputChange}
                            autoComplete="new-password"
                            endDecorator={
                                <IconButton onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            }
                        />
                        <FormHelperText sx={{ fontSize: 'xs' }}>
                            <InfoOutlined sx={{ fontSize: 'sm' }} />
                            At least 8 characters, including 1 letter and 1 number.
                        </FormHelperText>
                    </FormControl>

                    <FormControl required>
                        <FormLabel>Confirm Password</FormLabel>
                        <Input
                            name="confirmPassword"
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            autoComplete="new-password"
                        />
                    </FormControl>

                    <Button
                        type="submit"
                        loading={isLoading}
                        loadingPosition="center"
                        endDecorator={<PersonAdd />}
                    >
                        {isLoading ? 'Creating Account...' : 'Register'}
                    </Button>

                    <Divider>or</Divider>

                    <Button
                        variant="outlined"
                        color="neutral"
                        onClick={() => navigate('/login')}
                        endDecorator={<Login />}
                    >
                        Already have an account?
                    </Button>
                </Stack>
            </form>
        </Box>
        </MainLayout>
    );
};

export default Register;