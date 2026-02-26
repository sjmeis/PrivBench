import React, { useEffect, useState, useCallback } from 'react';
import { Table, Button, Typography, Chip, IconButton, Box, Card, LinearProgress } from '@mui/joy';
import { DeleteForever, Refresh, PlayArrow, Stop, Replay } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarProvider';
import ModuleLogModal from './ModuleLogModal';
import { API_BASE_URL } from '../../config';

const ModuleOrchestration = () => {
  const [modules, setModules] = useState([]);
  const [loadingRows, setLoadingRows] = useState({}); // Track which modules are busy
  const { showSnackbar } = useSnackbar();
  const [logModal, setLogModal] = useState({ open: false, id: null, name: '' });

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/modules/status`, {
              credentials: "include",
            });
      const data = await res.json();
      setModules(data);
    } catch (err) {
      showSnackbar("Failed to fetch container status", "error");
    }
  }, [showSnackbar]);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  // General handler for Docker actions
  const handleAction = async (id, action) => {
    setLoadingRows(prev => ({ ...prev, [id]: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/modules/${action}/${id}`, { method: 'POST', credentials: "include"});
      if (res.ok) {
        showSnackbar(`Module ${action} successful`, "success");
      } else {
        const err = await res.json();
        throw new Error(err.message || `Failed to ${action}`);
      }
    } catch (err) {
      showSnackbar(err.message, "error");
    } finally {
      setLoadingRows(prev => ({ ...prev, [id]: false }));
      fetchStatus();
    }
  };

  const confirmPurge = (id) => {
    if (window.confirm("CRITICAL: This will delete the Docker Image and all database scores for this module. Proceed?")) {
      handleAction(id, 'purge');
    }
  };

  return (
    <Card variant="outlined" sx={{ overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography level="h3">Container Orchestration</Typography>
        <Button 
          startDecorator={<Refresh />} 
          variant="plain" 
          onClick={fetchStatus}
        >
          Refresh All
        </Button>
      </Box>

      <Table sx={{ '& tr > *': { textAlign: 'left' }, minWidth: 800 }}>
        <thead>
          <tr>
            <th style={{ width: '20%' }}>Module Name</th>
            <th style={{ width: '10%' }}>Resource</th>
            <th style={{ width: '15%' }}>Image</th>
            <th style={{ width: '15%' }}>Container</th>
            <th style={{ width: '40%' }}>Orchestration Actions</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.id} style={{ opacity: loadingRows[m.id] ? 0.6 : 1 }}>
              <td>
                <Typography fontWeight="bold">{m.name}</Typography>
                {loadingRows[m.id] && <LinearProgress size="sm" sx={{ mt: 1 }} />}
              </td>
              <td>
                <Chip size="sm" variant="soft" color={m.use_gpu ? 'warning' : 'neutral'}>
                  {m.use_gpu ? 'NVIDIA GPU' : 'CPU'}
                </Chip>
              </td>
              <td>
                {m.image_exists ? 
                  <Chip color="success" variant="solid" size="sm">IMAGE READY</Chip> : 
                  <Chip color="danger" variant="outlined" size="sm">NO IMAGE</Chip>
                }
              </td>
              <td>
                <Chip 
                  variant="soft" 
                  color={m.container_status === 'running' ? 'success' : 'neutral'}
                >
                  {m.container_status || 'not found'}
                </Chip>
              </td>
              <td>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {/* Start/Stop Logic */}
                  {m.container_status === 'running' ? (
                    <Button 
                      size="sm" 
                      variant="soft" 
                      color="neutral" 
                      startDecorator={<Stop />}
                      onClick={() => handleAction(m.id, 'stop')}
                      disabled={loadingRows[m.id]}
                    >
                      Stop
                    </Button>
                  ) : (
                    <Button 
                      size="sm" 
                      variant="soft" 
                      color="success" 
                      startDecorator={<PlayArrow />}
                      onClick={() => handleAction(m.id, 'start')}
                      disabled={loadingRows[m.id] || !m.image_exists}
                    >
                      Start
                    </Button>
                  )}

                  {/* Rebuild: Keep DB scores, refresh image layers */}
                  <Button 
                    size="sm" 
                    variant="outlined" 
                    startDecorator={<Replay />}
                    onClick={() => handleAction(m.id, 'rebuild')}
                    disabled={loadingRows[m.id]}
                  >
                    Rebuild
                  </Button>

                  {/* Purge: Delete Everything */}
                  <IconButton 
                    size="sm" 
                    variant="solid" 
                    color="danger" 
                    onClick={() => confirmPurge(m.id)}
                    disabled={loadingRows[m.id]}
                  >
                    <DeleteForever />
                  </IconButton>

                  {/* Purge: See Logs for Container */}
                  <Button 
                    size="sm" 
                    variant="plain" 
                    color="neutral" 
                    startDecorator={<Refresh />}
                    onClick={() => setLogModal({ open: true, id: m.id, name: m.name })}
                    disabled={m.container_status !== 'running'}
                  >
                    Logs
                  </Button>
                </Box>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    <ModuleLogModal 
      open={logModal.open} 
      onClose={() => setLogModal({ ...logModal, open: false })}
      moduleId={logModal.id}
      moduleName={logModal.name}
    />
    </Card>
  );
};

export default ModuleOrchestration;