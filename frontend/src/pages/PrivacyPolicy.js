import { Typography, List, ListItem } from "@mui/joy";
import DocumentPage from "../components/shared/DocumentPage";

const PrivacyPolicy = () => {
  return (
    <DocumentPage title="Privacy Policy">
      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>1. An Overview of Data Protection</Typography>
      <p>
        The following information provides a simple overview of what happens to your personal data 
        when you visit this website. Personal data is any data that can be used to identify you personally.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>2. Data Collection, Infrastructure, and International Data Transfers</Typography>
      <p><strong>How do we collect your data?</strong></p>
      <p>
        Your data is collected strictly when you provide it to us. This includes the personal data 
        you enter in our registration form (your name and email address) and any optional data you choose 
        to provide (such as a profile picture). 
      </p>
      <p><strong>Data Storage and International Transfers (EU to US)</strong></p>
      <p>
        Our hosting and processing servers are physically located in the United States. If you are 
        accessing this service from the European Economic Area (EEA), your personal data (name, email, profile picture, 
        and system logs) will be transferred to and stored on our US infrastructure. To ensure an adequate level of 
        data protection matching GDPR requirements, we utilize Standard Contractual Clauses (SCCs) approved by the 
        European Commission to legally safeguard these cross-border transfers.
      </p>
      <p><strong>System Log Files</strong></p>
      <p>
        When you access our platform, our server automatically collects technical information necessary 
        for the secure operation and stability of the website (e.g., your IP address, browser type, and time of access). 
        This data is processed based on our legitimate interest (Article 6(1)(f) GDPR) to maintain system security.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>3. Use of Cookies and Local Storage</Typography>
      <p>
        Our website uses JSON Web Tokens (JWT) stored in cookies to manage your login session. 
        These cookies are strictly necessary for the technical functionality, authentication, 
        and secure operation of the "Upload" and "Profile" areas. They do not track your behavior across other websites.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>4. Benchmarking Datasets</Typography>
      <p>
        PrivBench is a platform for privacy-first benchmarking. While the datasets provided 
        for downloading contain sensitive data for research purposes, we ensure that:
      </p>
      <List marker="disc">
        <ListItem>Users must be authenticated to access datasets.</ListItem>
        <ListItem>The provided datasets are publicly available and free to use.</ListItem>
        <ListItem>Submissions are evaluated securely on our server.</ListItem>
      </List>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>5. Public Leaderboard Feature (Optional)</Typography>
      <p>
        If you choose to participate in our competitive benchmarking leaderboard, you have the option 
        to make your email address visible to other users and the public. This feature is entirely 
        optional and is disabled by default. We will only display your email address on the leaderboard 
        if you explicitly opt-in and grant us your consent (Article 6(1)(a) GDPR). You can withdraw this 
        consent at any time by toggling the feature off in your account settings.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>6. Purpose Limitation and Use of Data</Typography>
      <p>
        We process your name, email address, and profile picture strictly for the core functionality 
        of the platform as described in this policy. We do not use third-party analytics, payment 
        processors, or external tracking services. Your data will never be sold, rented, or shared with 
        third parties, nor will it be used for marketing newsletters. We will not use your personal 
        information for any secondary purposes without your explicit consent.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>7. Data Security</Typography>
      <p>
        All personal data is stored securely on our internal infrastructure. We implement appropriate 
        technical and organizational security measures to protect your name, email address, and profile 
        pictures against unauthorized access, loss, or alteration.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>8. Your Rights</Typography>
      <p>
        Under the GDPR, you possess specific, enforceable rights regarding your personal data. You can 
        exercise these rights at any time by contacting us at <strong>privbench@web.de</strong>.
      </p>
      <List marker="disc">
        <ListItem>
          <strong>Right to Access (Article 15):</strong> You have the right to request a copy of the personal 
          data we hold about you, including your name, email address, and profile picture.
        </ListItem>
        <ListItem>
          <strong>Right to Rectification (Article 16):</strong> You have the right to correct inaccurate or 
          incomplete data. You can update your name, email, or profile picture directly in your account settings.
        </ListItem>
        <ListItem>
          <strong>Right to Erasure (Article 17):</strong> You have the right to request the permanent deletion 
          of your data. If you delete your profile picture or close your account, your name, email, and photo 
          will be automatically and permanently removed from our active databases.
        </ListItem>
        <ListItem>
          <strong>Right to Data Portability (Article 20):</strong> You have the right to receive your personal 
          data in a structured, commonly used, and machine-readable format to easily transfer it to another provider.
        </ListItem>
        <ListItem>
          <strong>Right to Withdraw Consent (Article 7):</strong> You have the right to withdraw your consent 
          for optional features (such as your profile picture upload or your public leaderboard participation) at 
          any time by removing the asset or toggling the feature off in your settings.
        </ListItem>
        <ListItem>
          <strong>Right to Lodge a Complaint (Article 77):</strong> You have the right to file a complaint with 
          a data protection supervisory authority if you believe our processing of your data violates the GDPR.
        </ListItem>
      </List>
    </DocumentPage>
  );
};

export default PrivacyPolicy;
