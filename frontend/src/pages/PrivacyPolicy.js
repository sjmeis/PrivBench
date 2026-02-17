import { Typography, List, ListItem } from "@mui/joy";
import DocumentPage from "../components/shared/DocumentPage";

const PrivacyPolicy = () => {
  return (
    <DocumentPage title="Privacy Policy">
      <Typography level="h4">1. An Overview of Data Protection</Typography>
      <p>
        The following information provides a simple overview of what happens to your personal data 
        when you visit this website. Personal data is any data that can be used to identify you personally.
      </p>

      <Typography level="h4">2. Data Collection on Our Website</Typography>
      <p><strong>How do we collect your data?</strong></p>
      <p>
        Your data is collected when you provide it to us. This could, for example, be the data 
        you enter in a registration form (e.g., username, email address). Other data is collected 
        automatically by our IT systems (e.g., IP address, browser type).
      </p>

      <Typography level="h4">3. Use of Cookies and Local Storage</Typography>
      <p>
        Our website uses JWT (JSON Web Tokens) stored in cookies to manage your login session. 
        These are necessary for the technical functionality of the "Upload" and "Profile" areas.
      </p>

      <Typography level="h4">4. Benchmarking Datasets</Typography>
      <p>
        PrivBench is a platform for privacy-first benchmarking. While the datasets provided 
        for downloading contain sensitive data for research purposes, we ensure that:
      </p>
      <List marker="disc">
        <ListItem>Users must be authenticated to access datasets.</ListItem>
        <ListItem>The provided datasets are publicly available and free to use.</ListItem>
        <ListItem>Submissions are evaluated securely on our server.</ListItem>
      </List>

      <Typography level="h4">5. Your Rights</Typography>
      <p>
        You have the right to receive information about the origin, recipient, and purpose of 
        your stored personal data free of charge at any time. You also have the right to 
        request the correction or deletion of this data.
      </p>
    </DocumentPage>
  );
};

export default PrivacyPolicy;