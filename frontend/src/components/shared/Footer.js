import { Box, Typography, Link } from "@mui/joy";
import { useNavigate } from "react-router-dom";
const Footer = () => {
  const navigate = useNavigate();

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
          onClick={() => navigate("https://www.cs.cit.tum.de/sebis/")}
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
      </Box>
    </Box>
  );
};
export default Footer;
