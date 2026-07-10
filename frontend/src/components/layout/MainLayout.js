/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/


import { Box } from "@mui/joy";
import Footer from "../shared/Footer";

const MainLayout = ({ children }) => {
  return (
    <Box sx={{ display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                width: "100%",
                overflowX: "hidden",
            }}>
      <Box component="main" sx={{
          flex: 1, 
          width: "100%",
          paddingX: '40px',
          paddingTop: '10px',
          paddingBottom: '40px',
        }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout;