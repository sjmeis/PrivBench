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

const TermsOfService = () => {
  return (
    <DocumentPage title="Terms of Service">
      Last Updated: July 2026

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>1. Acceptance of Terms</Typography>
      <p>
        By creating an account, authenticating, or accessing the benchmarking datasets on PrivBench, 
        you agree to be bound by these Terms of Service. If you do not agree to these terms, 
        you may not use the platform or access any provided materials.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>2. Account Eligibility and Security</Typography>
      <p>
        To access our privacy-first benchmarking datasets, you must create a registered account. 
        You agree to provide accurate registration information (including a valid name and email address). 
        You are solely responsible for maintaining the confidentiality of your session token and account security, 
        and for all activities that occur under your account.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>3. Dataset Usage and Academic Purpose</Typography>
      <p>
        PrivBench provides datasets containing privacy-sensitive data exclusively for research and 
        benchmarking purposes. By downloading any dataset, you explicitly agree to the following conditions:
      </p>
      <List marker="disc">
        <ListItem>You will use the data solely for evaluation and academic/scientific research.</ListItem>
        <ListItem>You will make no attempt to re-identify any individuals or entities contained within the datasets.</ListItem>
        <ListItem>You will not redistribute, sell, or host these datasets on external public servers.</ListItem>
      </List>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>4. User Submissions and Evaluations</Typography>
      <p>
        When you submit datasets to our servers for evaluation, you grant PrivBench a non-exclusive, 
        worldwide, royalty-free license to securely evaluate your submission on our infrastructure. 
        If you choose to participate in our optional public leaderboard, you grant us permission to 
        display your benchmark scores alongside your chosen username, research institution, and/or opted-in email address.
      </p>
      <p>
        You retain all intellectual property rights over all datasets you submit 
        to PrivBench. By making a submission, you warrant that you possess the necessary rights and 
        licenses to run evaluations on the provided datasets and that your submission does not infringe 
        upon the intellectual property or copyright of any third party.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>5. Prohibited Conduct</Typography>
      <p>
        You agree not to misuse the PrivBench platform. Prohibited behavior includes, but is not limited to:
      </p>
      <List marker="disc">
        <ListItem>Attempting to bypass authentication or access datasets without authorization.</ListItem>
        <ListItem>Interfering with, disrupting, or launching denial-of-service (DoS) attacks against our evaluation servers.</ListItem>
        <ListItem>Uploading malicious code, scripts, or files designed to compromise our internal infrastructure.</ListItem>
      </List>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>6. Termination of Access</Typography>
      <p>
        We reserve the right to suspend or terminate your account and restrict your access to datasets 
        at our sole discretion, without prior notice, if we detect a breach of these Terms of Service or 
        any suspicious activity targeting our server's integrity.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>7. Limitation of Liability and Disclaimer</Typography>
      <p>
        PrivBench is provided on an "as-is" and "as-available" basis. We make no guarantees regarding 
        uninterrupted availability, server uptime, or complete mathematical accuracy of the evaluation metrics. 
        To the maximum extent permitted by applicable law, PrivBench shall not be liable for any indirect, 
        incidental, or consequential damages resulting from your use or inability to use the platform.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>8. Governing Law and Jurisdiction</Typography>
      <p>
        These Terms of Service and any contractual disputes arising from your use of the platform are governed 
        by the laws of Germany, without regard to its conflict of law principles. Any legal actions or proceedings 
        related to PrivBench shall be brought exclusively in the courts located in Germany. For any questions, 
        disputes, or support requests regarding these terms, please contact us at <strong>privbench@web.de</strong>.
      </p>

      <Typography level="h4" sx={{ mt: 3, mb: 1 }}>9. Modifications to the Terms of Service</Typography>
      <p>
        We reserve the right to modify these Terms of Service at any time. Material changes will be 
        communicated via email prior to the changes taking effect. 
        Your continued use of PrivBench following the posting of varied terms constitutes your acceptance 
        of those changes.
      </p>
    </DocumentPage>
  );
};

export default TermsOfService;
