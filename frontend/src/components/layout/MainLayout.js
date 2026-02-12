import { Box } from "@mui/joy";
import Footer from "../shared/Footer";

const MainLayout = ({ children }) => {
  return (
    <Box sx={{ display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                width: "100%",
                overflowX: "hidden",
                margin: 0,
                padding: 0,
            }}>
      <Box component="main" sx={{
          flex: 1,
          py: 4,
          px: { xs: 2, md: 4 },
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout;