import React from "react";
import { useNavigate } from "react-router-dom";
import {Avatar, Dropdown, Grid, ListDivider, Menu, MenuButton, MenuItem, Stack, useColorScheme} from "@mui/joy";
import { Box, Button, Typography } from "@mui/joy";
import {DarkMode, Info, Timeline, UploadFile, Login} from "@mui/icons-material";
import { useAuth } from '../contexts/AuthContext';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {generateRandomGravatarUrl} from "../utils/Gravatar";


const Navbar = () => {
    const navigate = useNavigate();
    const { mode, setMode } = useColorScheme();
    const { user, logout } = useAuth();

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

                        {user ? (
                            <Dropdown>

                                <MenuButton endDecorator={<Avatar sx={{maxWidth: 28, maxHeight: 28}} size="sm" src={generateRandomGravatarUrl()}/>}
                                    variant="soft"
                                    color="primary"
                                    size="sm" sx={{height: 37}}d

                                >
                                    {user.username}
                                </MenuButton>
                                <Menu
                                    placement="bottom-end"
                                    size="sm"
                                    sx={{
                                        zIndex: '99999',
                                        p: 1,
                                        gap: 1,
                                        '--ListItem-radius': 'var(--joy-radius-sm)',
                                    }}
                                >
                                    <MenuItem onClick={() => navigate("/profile")}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <Avatar
                                                src={generateRandomGravatarUrl()}
                                                sx={{ borderRadius: '50%' }}
                                            />
                                            <Box sx={{ ml: 1.5 }}>
                                                <Typography level="title-sm" textColor="text.primary">
                                                    {user.username}
                                                </Typography>
                                                <Typography level="body-xs" textColor="text.tertiary">
                                                    rick@email.com
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                    <ListDivider />
                                    <MenuItem>
                                        <EmojiEventsIcon />
                                        My Submissions
                                    </MenuItem>
                                    <MenuItem>
                                        <SettingsRoundedIcon />
                                        Settings
                                    </MenuItem>
                                    <ListDivider />
                                    <MenuItem component="a">
                                        First look at tbd
                                        <OpenInNewRoundedIcon />
                                    </MenuItem>
                                    <MenuItem
                                        component="a"
                                    >
                                        Sourcecode
                                        <OpenInNewRoundedIcon />
                                    </MenuItem>
                                    <ListDivider />
                                    <MenuItem onClick={handleLogout}>
                                        <LogoutRoundedIcon />
                                        Log out
                                    </MenuItem>
                                </Menu>
                            </Dropdown>
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