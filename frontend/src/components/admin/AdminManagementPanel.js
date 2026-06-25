import { useState, useEffect } from "react";
import { Box, Typography, Card, Table, Switch, Button, Select, Option, Alert, CircularProgress, Sheet } from "@mui/joy";
import axios from "axios";
import { API_BASE_URL } from "src/config";

const AdminManagementPanel = () => {
  const [admins, setAdmins] = useState([]);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    fetchAdminManagementData();
  }, []);

  const fetchAdminManagementData = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/management/list`, { withCredentials: true });
      setAdmins(res.data.currentAdmins);
      setCandidates(res.data.candidates);
    } catch (err) {
      console.error("Failed to load management data logs:", err);
      setFeedback({ type: "danger", text: "Access denied or session invalid. Superadmin privileges required." });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAdminStatus = async (userId, targetStatus) => {
    setActionLoading(true);
    setFeedback(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/admin/management/toggle/${userId}`, 
        { admin: targetStatus }, 
        { withCredentials: true }
      );
      setFeedback({ type: "success", text: res.data.message });
      fetchAdminManagementData(); // Refresh datasets
    } catch (err) {
      setFeedback({ type: "danger", text: err.response?.data?.message || "Role adjustment transaction failed." });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <CircularProgress size="md" sx={{ mx: "auto", display: "block", mt: 4 }} />;

  return (
    <Box sx={{ p: 3, maxWidth: "900px", mx: "auto" }}>
      <Typography level="h2" sx={{ mb: 1 }}>Administrative Role Permissions</Typography>
      <Typography level="body-sm" textColor="text.secondary" sx={{ mb: 4 }}>
        Stratify global team boundaries. Review, assign, or strip baseline admin access privileges.
      </Typography>

      {feedback && <Alert color={feedback.type} size="sm" sx={{ mb: 3 }}>{feedback.text}</Alert>}

      {/* PROMOTION UTILITY CONTROL CONTAINER */}
      <Card variant="outlined" sx={{ p: 3, mb: 4, display: "flex", flexDirection: "row", gap: 2, alignItems: "flex-end", flexWrap: "wrap" }}>
        <Box sx={{ flex: 1, minWidth: "250px" }}>
          <Typography level="title-sm" sx={{ mb: 1 }}>Promote User to Admin Role</Typography>
          <Select
            placeholder="Select a user profile candidate..."
            onChange={(e, val) => setSelectedCandidate(val)}
            value={selectedCandidate}
          >
            {candidates.map(u => (
              <Option key={u.id} value={u.id}>{u.username} ({u.mailAddress})</Option>
            ))}
          </Select>
        </Box>
        <Button 
          disabled={!selectedCandidate || actionLoading} 
          onClick={() => handleToggleAdminStatus(selectedCandidate, true)}
          color="success"
        >
          Grant Admin Privileges
        </Button>
      </Card>

      {/* OVERVIEW TABLE SHEET */}
      <Typography level="title-md" sx={{ mb: 1.5 }}>Active System Administrators</Typography>
      <Sheet variant="outlined" sx={{ borderRadius: "sm", overflow: "auto" }}>
        <Table hoverRow>
          <thead>
            <tr>
              <th>Username</th>
              <th>Email Address</th>
              <th>Research Institute</th>
              <th style={{ textAlign: "center", width: "120px" }}>Admin Access</th>
            </tr>
          </thead>
          <tbody>
            {admins.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
                  No secondary system administrators assigned.
                </td>
              </tr>
            ) : (
              admins.map((u) => (
                <tr key={u.id}>
                  <td><Typography fontWeight="bold">{u.username}</Typography></td>
                  <td>{u.mailAddress}</td>
                  <td>{u.researchInstitute}</td>
                  <td style={{ textAlign: "center" }}>
                    <Switch
                      checked={true}
                      disabled={actionLoading}
                      color="primary"
                      onChange={() => handleToggleAdminStatus(u.id, false)}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </Table>
      </Sheet>
    </Box>
  );
};

export default AdminManagementPanel;