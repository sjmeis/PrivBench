import * as React from 'react';
import { Box, Card, Typography, CircularProgress, Grid, Divider, Stack } from '@mui/joy';
import { Cpu, Memory, Storage, Thermostat, Router } from '@mui/icons-material';
import { API_BASE_URL } from '../../config';

const MetricCard = ({ title, value, icon, color, subtext = "" }) => (
  <Card variant="outlined" sx={{ minWidth: 200, textAlign: 'center' }}>
    <Stack direction="row" spacing={1} alignItems="center" mb={1}>
      {icon}
      <Typography level="title-md">{title}</Typography>
    </Stack>
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', my: 2 }}>
      <CircularProgress
        size="lg"
        determinate
        value={value}
        color={value > 85 ? 'danger' : value > 60 ? 'warning' : color}
        sx={{ '--CircularProgress-size': '100px', '--CircularProgress-trackThickness': '8px' }}
      >
        <Typography level="h4">{value}%</Typography>
      </CircularProgress>
    </Box>
    {subtext && (
      <Typography level="body-xs" textAlign="center" sx={{ opacity: 0.7 }}>
        {subtext}
      </Typography>
    )}
  </Card>
);

const SystemHealth = () => {
  const [stats, setStats] = React.useState(null);
  const [error, setError] = React.useState(null);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/system-health`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      setError("Failed to reach monitoring service");
    }
  };

  React.useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000); // Update every 3 seconds
    return () => clearInterval(interval);
  }, []);

  if (error) return <Typography color="danger">{error}</Typography>;
  if (!stats) return <Typography>Initializing Monitor...</Typography>;

  return (
    <Box sx={{ p: 2 }}>
      <Typography level="h2" mb={1}>Server Health</Typography>
      <Typography level="body-sm" mb={4}>Live metrics for host VM hardware utilization.</Typography>
      
      <Grid container spacing={3} sx={{ flexGrow: 1 }}>
        <Grid xs={12} sm={6} md={3}>
          <MetricCard 
            title="CPU Usage" 
            value={stats.cpu} 
            icon={<Cpu />} 
            color="primary" 
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <MetricCard 
            title="Memory (RAM)" 
            value={stats.memory} 
            icon={<Memory />} 
            color="warning" 
          />
        </Grid>
        <Grid xs={12} sm={6} md={3}>
          <MetricCard 
            title="Storage" 
            value={stats.storage} 
            icon={<Storage />} 
            color="neutral" 
            subtext="Disk space utilization"
          />
        </Grid>

        {stats.gpu && (
          <Grid xs={12} sm={6} md={3}>
            <MetricCard 
              title="GPU Utilization" 
              value={stats.gpu.load} 
              icon={<Router />} 
              color="success" 
              subtext={`VRAM: ${stats.gpu.memory}% | Temp: ${stats.gpu.temp}°C`}
            />
          </Grid>
        )}
      </Grid>

      <Box sx={{ mt: 4, opacity: 0.5, textAlign: 'right' }}>
        <Typography level="body-xs">
          Last check: {new Date(stats.last_updated * 1000).toLocaleTimeString()}
        </Typography>
      </Box>
    </Box>
  );
};

export default SystemHealth;