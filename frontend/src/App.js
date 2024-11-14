import React from "react";
import {Box} from "@mui/joy";
import {Route, Routes} from "react-router-dom";
import Navbar from "./components/Navbar.js";
import Home from "./pages/Home.js";
import Login from "./pages/Login.js";
import Information from "./pages/Information.js";
import Rankings from "./pages/Rankings.js";
import Upload from "./pages/Upload.js";
import {CssBaseline, CssVarsProvider} from "@mui/joy";
import customTheme from "./Theme/CustomTheme";


function App() {
    return (

        <CssVarsProvider defaultMode="dark" theme={customTheme}>
            <CssBaseline/>
            <Box display="flex"
                 flexDirection="column"
                 minHeight="98vh"
                 backgroundColor="primary.background"
            >
                <Navbar/>
                <Box flex="1" sx={{ padding: '40px'}}>
                    <Routes>
                        <Route path="/" element={<Home/>}/>
                        <Route path="/login" element={<Login/>}/>
                        <Route path="/rankings" element={<Rankings/>}/>
                        <Route path="/information" element={<Information/>}/>
                        <Route path="/upload" element={<Upload/>}/>
                    </Routes>
                </Box>
            </Box>
        </CssVarsProvider>
    );
}

export default App;
