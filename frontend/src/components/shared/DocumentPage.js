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


import { Box, Typography, Container } from "@mui/joy";
import MainLayout from "../layout/MainLayout";

const DocumentPage = ({ title, children }) => (
  <MainLayout>
    <Container sx={{ py: 8, maxWidth: "800px" }}>
      <Typography level="h1" sx={{ mb: 4, textAlign: 'center' }}>
        {title}
      </Typography>
      <Box sx={{ "& h2": { mt: 4, mb: 2 }, "& p": { mb: 2, color: 'text.secondary', lineHeight: 1.6 } }}>
        {children}
      </Box>
    </Container>
  </MainLayout>
);

export default DocumentPage;