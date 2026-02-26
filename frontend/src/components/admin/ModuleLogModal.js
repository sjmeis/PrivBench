import React, { useEffect, useState } from 'react';
import { Modal, ModalDialog, Typography, Box, IconButton, ModalClose, Sheet } from '@mui/joy';
import { Refresh, StopCircle } from '@mui/icons-material';

const ModuleLogModal = ({ open, onClose, moduleId, moduleName }) => {
  const [logs, setLogs] = useState("Loading logs...");
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch(`/api/modules/logs/${moduleId}`);
      const data = await res.json();
      setLogs(data.logs || "No logs available.");
    } catch (err) {
      setLogs("Failed to connect to container logs.");
    }
  };

  useEffect(() => {
    if (open) {
      fetchLogs();
      let interval;
      if (autoRefresh) {
        interval = setInterval(fetchLogs, 3000); // Refresh every 3 seconds
      }
      return () => clearInterval(interval);
    }
  }, [open, moduleId, autoRefresh]);

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ minWidth: '80vw', maxHeight: '80vh', p: 0 }}>
        <ModalClose />
        <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', bgcolor: 'neutral.800', color: 'white' }}>
          <Typography level="title-md" textColor="inherit">
            Logs: {moduleName}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton 
              size="sm" 
              variant="plain" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              color={autoRefresh ? "success" : "danger"}
            >
              {autoRefresh ? <Refresh /> : <StopCircle />}
            </IconButton>
          </Box>
        </Box>
        <Sheet
          sx={{
            flex: 1,
            overflow: 'auto',
            bgcolor: '#1e1e1e', // VS Code style background
            p: 2,
            fontFamily: 'monospace',
            fontSize: '13px',
            color: '#d4d4d4',
            whiteSpace: 'pre-wrap',
            minHeight: '400px'
          }}
        >
          {logs}
        </Sheet>
      </ModalDialog>
    </Modal>
  );
};

export default ModuleLogModal;