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


import React, { useState } from 'react';
import { Box, Typography, Link, Stack } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import { ContactFormModal } from "./ContactFormModal";

const Footer = () => {
  const navigate = useNavigate();
  const [isContactOpen, setIsContactOpen] = useState(false);

  return (
    <Box
      component="footer"
      sx={{
        width: "100%",
        boxSizing: "border-box",
        py: 3,
        px: 2,
        bgcolor: "background.surface",
        borderTop: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          textAlign: "center",
        }}
      >
        <Link
          component="button"
          onClick={() => navigate("/tos")}
          level="body1"
          sx={{
            textDecoration: "none",
            fontWeight: "md",
            fontSize: "1rem",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          Terms of Service
        </Link>
        <Typography level="body2" textColor="text.primary">{"·"}</Typography>
        <Link
          component="button"
          onClick={() => navigate("/privacy")}
          level="body1"
          sx={{
            textDecoration: "none",
            fontWeight: "md",
            fontSize: "1rem",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          Privacy Policy
        </Link>
        <Typography level="body2" textColor="text.primary">{"·"}</Typography>
        <Link
          component="button"
          onClick={() => navigate("/imprint")}
          level="body1"
          sx={{
            textDecoration: "none",
            fontWeight: "md",
            fontSize: "1rem",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          Imprint
        </Link>
        <Typography level="body2" textColor="text.primary">
          {"·"}
        </Typography>
        <Typography level="body2" textColor="text.primary">
          © {new Date().getFullYear()} PrivBench
        </Typography>
        <Typography level="body2" textColor="text.primary">
          {"·"}
        </Typography>
        <Link
          component="button"
          onClick={() => navigate("/version-history")}
          level="body1"
          sx={{
            textDecoration: "none",
            fontWeight: "md",
            fontSize: "1rem",
            "&:hover": {
              textDecoration: "underline",
            },
          }}
        >
          Version History
        </Link>
        <Typography level="body2" textColor="text.primary">
          {"·"}
        </Typography>
        <Link
          component="button"
          onClick={() => setIsContactOpen(true)}
          level="body1"
          sx={{ textDecoration: "none", fontWeight: "md", fontSize: "1rem", "&:hover": { textDecoration: "underline" } }}
        >
          Contact Us
        </Link>
      </Box>

      {/* CC BY-NC-ND License Notice */}
      <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems="center"
          justifyContent="center"
          sx={{ textAlign: "center" }}
        >
          <Link
            href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{ display: "inline-flex", alignItems: "center" }}
          >
            <img
              src="https://licensebuttons.net/l/by-nc-nd/4.0/88x31.png"
              alt="Creative Commons License (CC BY-NC-ND 4.0)"
              style={{ height: "26px", border: 0 }}
            />
          </Link>
          <Typography level="body-xs" textColor="text.secondary">
            This platform is licensed under a{" "}
            <Link
              href="https://creativecommons.org/licenses/by-nc-nd/4.0/"
              target="_blank"
              rel="noopener noreferrer"
              underline="hover"
              textColor="text.primary"
              sx={{ fontWeight: "md" }}
            >
              Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International (CC BY-NC-ND 4.0) License
            </Link>
            .
          </Typography>
        </Stack>

      <ContactFormModal 
        open={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </Box>
  );
};
export default Footer;
