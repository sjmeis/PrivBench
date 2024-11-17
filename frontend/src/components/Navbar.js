import React from "react";
import { useNavigate } from "react-router-dom";
import { Grid, Stack, useColorScheme } from "@mui/joy";
import { Box, Button, Typography } from "@mui/joy";
import { DarkMode, Info, Timeline, UploadFile, LogoutRounded } from "@mui/icons-material";
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
    const navigate = useNavigate();
    const { mode, setMode } = useColorScheme();
    const { user, logout, isAuthenticated } = useAuth();

    if (!mode) {
        return null;
    }

    const handleChange = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    return (
        <Box
            sx={{
                width: '100%',
                padding: 2,
                borderBottom: '1.5px solid #161a1b',
            }}
        >
            <Grid container alignItems="center">
                {/* Left-aligned logo */}
                <Grid item xs={1} container justifyContent="flex-start">
                    <Typography
                        onClick={() => navigate("/")}
                        level="h2"
                        sx={{ cursor: 'pointer' }}
                    >
                        PrivBench
                    </Typography>
                </Grid>

                {/* Centered buttons */}
                <Grid item xs={10} container justifyContent="center">
                    <Button
                        onClick={() => navigate("/rankings")}
                        color="inherit"
                        startDecorator={<Timeline/>}
                        sx={{
                            color: "primary.textPrimary",
                            bgcolor: "transparent !important",
                            textTransform: "none",
                            fontWeight: "medium",
                            fontSize: "1.2rem",
                            mx: 1,
                        }}
                    >
                        Rankings
                    </Button>
                    <Button
                        onClick={() => navigate("/upload")}
                        color="inherit"
                        startDecorator={<UploadFile/>}
                        sx={{
                            color: "primary.textPrimary",
                            bgcolor: "transparent !important",
                            textTransform: "none",
                            fontWeight: "medium",
                            fontSize: "1.2rem",
                            mx: 1,
                        }}
                    >
                        Upload
                    </Button>
                    <Button
                        onClick={() => navigate("/information")}
                        color="inherit"
                        startDecorator={<Info/>}
                        sx={{
                            color: "primary.textPrimary",
                            bgcolor: "transparent !important",
                            textTransform: "none",
                            fontWeight: "medium",
                            fontSize: "1.2rem",
                            mx: 1,
                        }}
                    >
                        How does it work?
                    </Button>
                </Grid>

                {/* Right-aligned authentication and theme buttons */}
                <Grid item xs={1} container justifyContent="flex-end" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            onClick={handleChange}
                            variant="outlined"
                            color="neutral"
                            size="sm"
                            sx={{
                                height: 36,
                                width: 36,
                                minWidth: 'auto',
                                padding: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <DarkMode />
                        </Button>

                        {isAuthenticated ? (
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography level="body-sm" sx={{ color: 'primary.textPrimary' }}>
                                    {user.username}
                                </Typography>
                                <Button
                                    variant="soft"
                                    color="primary"
                                    onClick={handleLogout}
                                    startDecorator={<LogoutRounded />}
                                >
                                    Logout
                                </Button>
                            </Stack>
                        ) : (
                            <Button
                                variant="soft"
                                color="primary"
                                startDecorator={<Login/>}
                                onClick={() => navigate('/login')}
                            >
                                Login
                            </Button>
                        )}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Navbar;