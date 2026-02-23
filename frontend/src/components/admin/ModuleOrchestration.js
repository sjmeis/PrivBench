import React, { useEffect, useState } from 'react';
import { Table, Button, Typography, Chip, IconButton, Box, Card } from '@mui/joy';
import { DeleteForever, Refresh, PlayArrow, Stop } from '@mui/icons-material';

const ModuleOrchestration = () => {
  const [modules, setModules] = useState([]);

  const fetchStatus = async () => {
    const res = await fetch('/modules/status');
    const data = await res.json();
    setModules(data);
  };

  useEffect(() => { fetchStatus(); }, []);

  const handleRebuild = async (id) => {
    if (window.confirm("This will delete all scores and the Docker image for this module. Continue?")) {
      await fetch(`/modules/rebuild/${id}`, { method: 'POST' });
      fetchStatus();
    }
  };

  return (
    <Card variant="outlined">
      <Typography level="h3" mb={2}>Module Container Orchestration</Typography>
      <Table sx={{ '& tr > *': { textAlign: 'left' } }}>
        <thead>
          <tr>
            <th>Module Name</th>
            <th>GPU</th>
            <th>Docker Image</th>
            <th>Container Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {modules.map((m) => (
            <tr key={m.id}>
              <td>{m.name}</td>
              <td><Chip size="sm" color={m.use_gpu ? 'warning' : 'neutral'}>{m.use_gpu ? 'GPU' : 'CPU'}</Chip></td>
              <td>{m.image_exists ? <Chip color="success">Ready</Chip> : <Chip color="danger">Missing</Chip>}</td>
              <td>
                <Chip variant="soft" color={m.container_status === 'running' ? 'success' : 'neutral'}>
                  {m.container_status}
                </Chip>
              </td>
              <td>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <IconButton size="sm" color="danger" onClick={() => handleRebuild(m.id)}>
                    <DeleteForever />
                  </IconButton>
                  <IconButton size="sm" variant="outlined" onClick={fetchStatus}>
                    <Refresh />
                  </IconButton>
                </Box>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>
    </Card>
  );
};

export default ModuleOrchestration;