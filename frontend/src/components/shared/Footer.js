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
import { Box, Typography, Link } from "@mui/joy";
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
        {/* <Link
          href="https://www.cs.cit.tum.de/sebis/"
          target="_blank"
          rel="noopener noreferrer"
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
          sebis Homepage
        </Link>
        <Typography level="body2" textColor="text.primary">
          {"·"} 
        </Typography>*/}
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
      <ContactFormModal 
        open={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </Box>
  );
};
export default Footer;
