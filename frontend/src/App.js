import React from "react";
import {Box} from "@mui/material";
import {Route, Routes} from "react-router-dom";
import Navbar from "./components/Navbar.js";
import Home from "./pages/Home.js";
import Login from "./pages/Login.js";
import Information from "./pages/Information.js";
import Rankings from "./pages/Rankings.js";
import Upload from "./pages/Upload.js";


function App() {
  return (
    <Box display="flex"
         flexDirection="column"
         minHeight="98vh"
         backgroundColor="primary.background"
    >
      <Navbar/>

      <Box flex="1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/rankings" element={<Rankings />} />
          <Route path="/information" element={<Information />} />
          <Route path="/upload" element={<Upload />} />
        </Routes>
      </Box>
    </Box>
  );
}

export default App;
