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