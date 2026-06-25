import { useState, useEffect } from "react";
import { Card, Typography, Switch, Box, Alert, CircularProgress } from "@mui/joy";
import axios from "axios";
import { API_BASE_URL } from "src/config";

const DemoDataManagement = () => {
  const [demoActive, setDemoActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    checkDemoStatus();
  }, []);

  const checkDemoStatus = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/admin/demo-data/status`, { withCredentials: true });
      setDemoActive(res.data.demoActive);
    } catch (err) {
      console.error("Failed to fetch mock data status indicators:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (event) => {
    const checked = event.target.checked;
    setProcessing(true);
    setMessage(null);

    try {
      const res = await axios.post(`${API_BASE_URL}/admin/demo-data/toggle`, 
        { enable: checked }, 
        { withCredentials: true }
      );
      setDemoActive(res.data.demoActive);
      setMessage({ type: "success", text: res.data.message });
    } catch (err) {
      setMessage({ type: "danger", text: err.response?.data?.message || "Error modifying system dataset context state bounds." });
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <CircularProgress size="sm" />;

  return (
    <Card variant="outlined" sx={{ p: 3, maxWidth: "500px", mt: 2 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography level="title-md">Platform Demonstration Mock Data</Typography>
          <Typography level="body-xs" textColor="text.secondary">
            Generates or purges artificial evaluation profiles, submission runs, and global charts on demand.
          </Typography>
        </Box>
        <Switch
          checked={demoActive}
          disabled={processing}
          onChange={handleToggle}
          color={demoActive ? "success" : "neutral"}
          slotProps={{ input: { 'aria-label': 'Toggle Demo Data State profiles' } }}
        />
      </Box>

      {processing && (
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, mt: 2 }}>
          <CircularProgress size="sm" />
          <Typography level="body-xs" sx={{ italic: true }}>
            Modifying environment parameters... This may take several seconds.
          </Typography>
        </Box>
      )}

      {message && (
        <Alert color={message.type} size="sm" sx={{ mt: 2 }}>
          {message.text}
        </Alert>
      )}
    </Card>
  );
};

export default DemoDataManagement;