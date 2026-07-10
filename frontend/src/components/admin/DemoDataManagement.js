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
            Generates or delete mock data for demonstration purposes.
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
            Running population script... This may take a little bit.
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