import { Box } from "@mui/joy";
import Footer from "../shared/Footer";

const MainLayout = ({ children }) => {
  return (
    <Box sx={{ display: "flex",
                flexDirection: "column",
                minHeight: "100vh",
                width: "100vw",
                marginBottom: "-40px",
            }}>
      <Box component="main" sx={{ flex: 1 }}>
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default MainLayout;