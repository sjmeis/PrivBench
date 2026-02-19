import React from "react";
import { Box } from "@mui/joy";
import { Route, Routes } from "react-router-dom";
import { CssBaseline, CssVarsProvider } from "@mui/joy";
import customTheme from "./Theme/CustomTheme";
import { AuthProvider } from "./contexts/AuthContext";

// Components
import Navbar from "./components/shared/Navbar";

// Pages
import Home from "./pages/Home";
import Login from "./pages/Login";
import Information from "./pages/Information";
import Rankings from "./pages/Rankings";
import Upload from "./pages/Upload";
import Register from "./pages/Register";
import RankingDetailView from "./pages/RankingDetailView";
import ProtectedRoutes from "./routes/ProtectedRoutes";
import UploadRouteGuard from "./routes/UploadRouteGuard";
import UserProfile from "./pages/UserProfile";
import AdminView from "./pages/AdminView";
import ProtectedRoutesAdmin from "./routes/ProtectedRoutesAdmin";
import { SnackbarProvider } from "./contexts/SnackbarProvider";
import VersionHistory from "./pages/VersionHistory";
import Imprint from "./pages/Imprint";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from './pages/VerifyEmail';

function App() {
  return (
    <SnackbarProvider>
      <AuthProvider>
        <CssVarsProvider defaultMode="dark" theme={customTheme}>
          <CssBaseline />
          <Navbar />
          <Box
            sx={{
              minHeight: "100vh", 
              backgroundColor: "background.body", // Use theme variable
              display: "flex",
              flexDirection: "column",
              //minHeight="calc(100vh - 65.5px)"
            }}
          >
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/rankings" element={<Rankings />} />
                <Route path="/forgot-password" element={<ForgotPassword />} /> 
                <Route path="/reset-password/:token" element={<ResetPassword />} />
                <Route
                  path="/rankings/detail"
                  element={<RankingDetailView />}
                />
                <Route path="/information" element={<Information />} />
                <Route path="/register" element={<Register />} />
                <Route path="/verify-email/:token" element={<VerifyEmail />} />
                <Route path="/imprint" element={<Imprint />} />
                <Route path="/privacy" element={<PrivacyPolicy />} />

                <Route element={<ProtectedRoutesAdmin />}>
                  <Route path="/admin" element={<AdminView />} />
                </Route>
                <Route element={<ProtectedRoutes />}>
                  <Route element={<UploadRouteGuard />}>
                    <Route path="/upload" element={<Upload />} />
                  </Route>
                </Route>
                <Route element={<ProtectedRoutes />}>
                  <Route path="/profile" element={<UserProfile />} />
                </Route>
                <Route element={<ProtectedRoutes />}>
                  <Route path="/version-history" element={<VersionHistory />} />
                </Route>
              </Routes>
            </Box>
        </CssVarsProvider>
      </AuthProvider>
    </SnackbarProvider>
  );
}

export default App;
