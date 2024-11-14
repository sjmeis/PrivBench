import React from "react";

import {useNavigate} from "react-router-dom";
import {Grid, Stack, useColorScheme} from "@mui/joy";
import {Box, Button, Typography} from "@mui/joy";
import {DarkMode, Info, Timeline, UploadFile} from "@mui/icons-material";



const Navbar = () => {
    const navigate = useNavigate();

    const { mode, setMode } = useColorScheme();

    if (!mode) {
        return null; // Return nothing if mode is not defined
    }


    const handleChange = () => {
        console.log(mode)
        setMode(mode === 'dark' ? 'light': 'dark' );
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
                {/* Left-aligned avatar */}
                <Grid item xs={1} container justifyContent="flex-start">
                    <Typography onClick={() => navigate("/")} level="h2">PrivBench</Typography>
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
                            mx: 1, // Reduced horizontal margin
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
                            mx: 1, // Reduced horizontal margin
                        }}
                    >
                        How does it work?
                    </Button>
                </Grid>

                {/* Right-aligned login button */}
                <Grid item xs={1} container justifyContent="flex-end" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            onClick={handleChange}
                            variant="outlined"
                            color="neutral"
                            size="sm"
                            sx={{
                                height: 36, // Adjust button size as needed
                                width: 36,
                                minWidth: 'auto', // Prevents Joy's default min-width for buttons
                                padding: 0, // Removes default padding
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <DarkMode />
                        </Button>
                        <Button variant="soft" color="primary">
                            Login
                        </Button>
                    </Stack>
                </Grid>
            </Grid>

        </Box>
    );
}

export default Navbar;