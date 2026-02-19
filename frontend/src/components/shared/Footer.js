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
        <Link
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
      <ContactFormModal 
        open={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />
    </Box>
  );
};
export default Footer;
