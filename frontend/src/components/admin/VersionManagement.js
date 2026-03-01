import React, { useState, useEffect } from 'react';
import { Chip, Table, Typography, Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Box } from '@mui/joy';
import { History, Undo, Warning } from '@mui/icons-material';
import { useSnackbar } from '../../contexts/SnackbarProvider';
import { API_BASE_URL } from '../../config';
import axios from 'axios';

const VersionManagement = () => {
    const [history, setHistory] = useState([]);
    const [rollbackTarget, setRollbackTarget] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        const res = await fetch(`${API_BASE_URL}/versions/history`);
        const data = await res.json();
        setHistory(data);
    };

    const handleRollback = async () => {
        if (!rollbackTarget) return;
        setIsLoading(true);
        try {
            const res = await axios.post(`${API_BASE_URL}/admin/version/rollback`, 
                { targetVersion: rollbackTarget.version }, 
                { withCredentials: true }
            );
            
            showSnackbar(res.data.message, "success");
            fetchHistory();
        } catch (err) {
            showSnackbar("Recalculation error during rollback", "danger");
        } finally {
            setIsLoading(false);
            setRollbackTarget(null);
        }
    };

  return (
    <Box sx={{ mt: 3 }}>
      <Typography level="h3" startDecorator={<History />}>System Version History</Typography>
      <Table sx={{ mt: 2 }}>
        <thead>
          <tr>
            <th>Version</th>
            <th>Release Date</th>
            <th>Changes</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
        {history.length === 0 ? (
            <tr>
            <td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>
                No version history found.
            </td>
            </tr>
        ) : (
          history.map((v, index) => (
            <tr key={v.id}>
              <td>{v.version}</td>
              <td>{new Date(v.created_at).toLocaleString()}</td>
              <td>{v.updates.length} modules updated</td>
              <td>
                {index !== 0 && (
                  <Button 
                    size="sm" 
                    variant="soft" 
                    color="danger" 
                    startDecorator={<Undo />}
                    onClick={() => setRollbackTarget(v)}
                  >
                    Rollback to this version
                  </Button>
                )}
                {index === 0 && <Chip color="success">Current Version</Chip>}
              </td>
            </tr>
          ))
        )}
        </tbody>
      </Table>

      {/* Rollback Confirmation */}
      <Modal open={!!rollbackTarget} onClose={() => setRollbackTarget(null)}>
        <ModalDialog variant="outlined" role="alertdialog">
          <DialogTitle sx={{ color: 'danger.main' }}><Warning /> Permanent Rollback</DialogTitle>
          <DialogContent>
            You are about to revert the entire system to version <b>{rollbackTarget?.version}</b>. 
            All scores and updates published <b>after</b> this version will be PERMANENTLY DELETED.
          </DialogContent>
          <DialogActions>
            <Button 
                variant="solid" 
                color="danger" 
                loading={isLoading}
                onClick={handleRollback}
            >
                Confirm Rollback
            </Button>
            <Button 
                variant="plain" 
                color="neutral" 
                disabled={isLoading}
                onClick={() => setRollbackTarget(null)}
            >
                Cancel
            </Button>
            </DialogActions>
        </ModalDialog>
      </Modal>
    </Box>
  );
};

export default VersionManagement;