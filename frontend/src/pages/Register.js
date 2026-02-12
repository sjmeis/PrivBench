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
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords don't match");
            return false;
        }
        if (formData.password.length < 6) {
            setError("Password must be at least 6 characters long");
            return false;
        }
        if (formData.username.length < 3) {
            setError("Username must be at least 3 characters long");
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

        setIsLoading(true);

        try {
            await register(formData);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message);
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
                    <FormControl required>
                        <FormLabel>Password</FormLabel>
                        <Input
                            name="password"
                            type="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            autoComplete="new-password"
                        />
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