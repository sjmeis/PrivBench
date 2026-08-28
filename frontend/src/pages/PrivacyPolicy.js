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

import { Typography, List, ListItem } from "@mui/joy";
import DocumentPage from "../components/shared/DocumentPage";

const PrivacyPolicy = () => {
  return (
    <DocumentPage title="Privacy Policy">
      Last Updated: August 2026

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
      <p><strong>Server Location and International Data Transfers</strong></p>
      <p>
        PrivBench is hosted on self-managed infrastructure physically located in the United States. 
        If you access this service from the European Economic Area (EEA), the United Kingdom, or Switzerland, 
        your personal data (such as your account credentials, evaluation uploads, and system logs) will be transferred 
        to and processed directly on our US-based servers. This transfer is necessary for the performance of our 
        services and benchmarking evaluations pursuant to Article 49(1)(b) GDPR. We apply appropriate technical 
        safeguards, including TLS encryption in transit and encrypted data storage at rest, to protect all incoming data.
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

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>4. External Avatar Service (Gravatar)</Typography>
      <p>
        To provide default avatar icons without requiring image uploads, our platform integrates with 
        Gravatar (operated by Automattic Inc., 60 29th Street #343, San Francisco, CA 94110, USA). 
        When you view rankings or your profile, a cryptographic SHA-256/MD5 hash of your email address is sent 
        to Gravatar's servers to check for a linked avatar image. 
      </p>
      <p>
        This request discloses your IP address and hashed email to Automattic based on our legitimate interest 
        (Article 6(1)(f) GDPR) in presenting user profile imagery. Your raw email address is never sent to Gravatar. 
        For details on Automattic’s data handling, please refer to their privacy policy:{" "}
        <a href="https://automattic.com/privacy/" target="_blank" rel="noopener noreferrer" style={{ color: "inherit" }}>
          automattic.com/privacy
        </a>.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>5. Benchmarking Datasets</Typography>
      <p>
        PrivBench is a platform for privacy-first benchmarking. While the datasets provided 
        for downloading contain sensitive data for research purposes, we ensure that:
      </p>
      <List marker="disc">
        <ListItem>Users must be authenticated to access datasets.</ListItem>
        <ListItem>The provided datasets are publicly available and free to use.</ListItem>
        <ListItem>Submissions are evaluated securely on our server.</ListItem>
      </List>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>6. Public Leaderboard and Email Visibility</Typography>
      <p>
        When you publish a benchmark submission, your achieved metric scores, chosen username, and research institute 
        are made visible on the public leaderboard. Your email address is hidden by default. 
        We will only display your email address alongside public submissions if you explicitly enable 
        public email visibility in your account settings (Article 6(1)(a) GDPR). You can withdraw this 
        visibility at any time by toggling the option off in your profile.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>7. Purpose Limitation and Use of Data</Typography>
      <p>
        We process your data exclusively for operating and securing the PrivBench platform. 
        With the exception of the avatar lookup service (Gravatar) described in Section 4, we do not use 
        third-party analytics, behavioral trackers, or external marketing networks. Your data is never sold, 
        rented, or utilized for commercial ad profiling.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>8. Data Security</Typography>
      <p>
        All personal data is stored securely on our internal infrastructure. We implement appropriate 
        technical and organizational security measures to protect your name, email address, and profile 
        pictures against unauthorized access, loss, or alteration.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>9. Your Rights</Typography>
      <p>
        Under the GDPR, you possess specific, enforceable rights regarding your personal data. You can 
        exercise these rights at any time by contacting us at <strong>admin@privbench.com</strong>.
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

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>10. Children's Privacy</Typography>
      <p>
        Our platform and benchmarking datasets are intended strictly for academic and professional research. 
        We do not knowingly collect or solicit personal data from children under the age of 16. If we learn 
        that we have collected personal data from a child under 16 without verifiable parental consent, 
        we will delete that information as quickly as possible.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>11. Changes to this Privacy Policy</Typography>
      <p>
        We may update our Privacy Policy from time to time. We will notify you of any changes by posting 
        the new Privacy Policy on this page and updating the "Last Updated" date at the top of this document. 
        You are advised to review this Privacy Policy periodically for any changes.
      </p>
    </DocumentPage>
  );
};

export default PrivacyPolicy;
