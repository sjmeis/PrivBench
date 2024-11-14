import React from "react";
import {AppBar, Box, Button, Toolbar} from "@mui/material";
import logo from "../pictures/logo-transp.png";
import {Info, Login, Timeline, Upload} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";



const Navbar = () => {
    const navigate = useNavigate();

    return (
        <AppBar position="static" elevation={0} sx={{bgcolor: '#ff977b'}}>
            <Toolbar>
                <img
                    onClick={() => navigate("/")}
                    src={logo}
                    alt="PrivBench Logo"
                    style={{marginRight: "20px", marginLeft: "50px", height: "50px", width: "130px", cursor: "pointer"}}
                />
                {/* This pushes the next button to the right*/}
                <Box sx={{ flexGrow: 1 }} />
                <Button
                    onClick={() => navigate("/rankings")}
                    color="inherit"
                    startIcon={<Timeline />}
                    sx={{
                        color: "primary.textPrimary",
                        bgcolor: "transparent !important",
                        textTransform: "none",
                        fontWeight: "medium",
                        fontSize: "1.2rem",
                        margin: "0 15px",
                    }}
                >
                    Rankings
                </Button>
                <Button
                    onClick={() => navigate("/upload")}
                    color="inherit"
                    startIcon={<Upload />}
                    sx={{
                        color: "primary.textPrimary",
                        bgcolor: "transparent !important",
                        textTransform: "none",
                        fontWeight: "medium",
                        fontSize: "1.2rem",
                        margin: "0 15px",
                    }}
                >
                    Upload
                </Button>
                <Button
                    onClick={() => navigate("/information")}
                    color="inherit"
                    startIcon={<Info />}
                    sx={{
                        color: "primary.textPrimary",
                        bgcolor: "transparent !important",
                        textTransform: "none",
                        fontWeight: "medium",
                        fontSize: "1.2rem",
                        margin: "0 15px",
                    }}
                >
                    How does it work?
                </Button>
                <Button
                    onClick={() => navigate("/login")}
                    color="inherit"
                    startIcon={<Login />}
                    sx={{
                        color: "primary.textPrimary",
                        bgcolor: "transparent !important",
                        textTransform: "none",
                        fontWeight: "medium",
                        fontSize: "1.2rem",
                        margin: "0 15px",
                    }}
                >
                    Login
                </Button>

            </Toolbar>
        </AppBar>
    );
}

export default Navbar;