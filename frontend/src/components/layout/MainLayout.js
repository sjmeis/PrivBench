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