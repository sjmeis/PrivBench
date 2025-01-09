import React from "react";
import {Box} from "@mui/joy";
import {Route, Routes} from "react-router-dom";
import {CssBaseline, CssVarsProvider} from "@mui/joy";
import customTheme from "./Theme/CustomTheme";
import {AuthProvider} from './contexts/AuthContext';

// Components
import Navbar from "./components/shared/Navbar";
import Footer from "./components/shared/Footer";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Information from "./pages/Information";
import Rankings from "./pages/Rankings";
import Upload from "./pages/Upload";
import Register from "./pages/Register";
import RankingDetailView from "./pages/RankingDetailView";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import UserProfile from "./pages/UserProfile";
import AdminView from "./pages/AdminView";
import ProtectedRoutesAdmin from "./routes/ProtectedRoutesAdmin";
import {SnackbarProvider} from "./contexts/SnackbarProvider";

function App() {
    return (
        <SnackbarProvider>
            <AuthProvider>
                <CssVarsProvider defaultMode="dark" theme={customTheme}>
                    <CssBaseline/>
                    <Navbar/>
                    <Box
                        display="flex"
                        flexDirection="column"
                        minHeight="calc(100vh - 65.5px)"
                        backgroundColor="primary.background"
                    >
                        <Box flex="1" sx={{
                            paddingLeft: '40px',
                            paddingRight: '40px',
                            paddingTop: '10px',
                            paddingBottom: '40px'
                        }}>
                            <Routes>
                                <Route path="/" element={<Home/>}/>
                                <Route path="/login" element={<Login/>}/>
                                <Route path="/rankings" element={<Rankings/>}/>
                                <Route path="/rankings/detail" element={<RankingDetailView/>}/>
                                <Route path="/information" element={<Information/>}/>
                                <Route path="/register" element={<Register/>}/>

                                <Route element={<ProtectedRoutesAdmin/>}>
                                    <Route path="/admin" element={<AdminView/>}/>
                                </Route>
                                <Route element={<ProtectedRoutes/>}>
                                    <Route path="/upload" element={<Upload/>}/>
                                </Route>
                                <Route element={<ProtectedRoutes/>}>
                                    <Route path="/profile" element={<UserProfile/>}/>
                                </Route>
                            </Routes>
                        </Box>
                        <Footer/>
                    </Box>
                </CssVarsProvider>
            </AuthProvider>
        </SnackbarProvider>
    );
}

export default App;
