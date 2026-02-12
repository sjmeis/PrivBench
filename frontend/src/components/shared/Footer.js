import { Box, Typography, Link } from "@mui/joy";
import { useNavigate } from "react-router-dom";
const Footer = () => {
  const navigate = useNavigate();

  return (
    <Box
      component="footer"
      sx={{
        py: 2,
        //bottom: 0,
        width: "100%",
        mt: "auto",
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
