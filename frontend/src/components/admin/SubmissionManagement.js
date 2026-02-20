import React, { useState, useEffect } from 'react';
import { 
    Box, Table, Typography, Sheet, IconButton, Chip, Stack, Grid, Input,
    Divider, Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions 
} from '@mui/joy';
import { 
    KeyboardArrowDown, KeyboardArrowUp, DeleteForever, Visibility, Public, PublicOff 
} from '@mui/icons-material';
import SearchIcon from '@mui/icons-material/Search';
import axios from 'axios';
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from '../../config';
import { useSnackbar } from '../../contexts/SnackbarProvider';

const Row = ({ row, onDelete, onRefresh }) => {
    const [open, setOpen] = useState(false);
    const [toggling, setToggling] = useState(false);
    const navigate = useNavigate();
    const { showSnackbar } = useSnackbar();

    const handleToggleVisibility = async () => {
        setToggling(true);
        try {
            await axios.put(`${API_BASE_URL}/admin/submissions/${row.id}/toggle-visibility`, {}, { withCredentials: true });
            showSnackbar("Visibility updated", "success");
            onRefresh(); // Refresh the list to show new state
        } catch (err) {
            showSnackbar("Failed to update visibility", "danger");
        } finally {
            setToggling(false);
        }
    };

    return (
        <React.Fragment>
            <tr>
                <td>
                    <IconButton size="sm" variant="plain" onClick={() => setOpen(!open)}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </td>
                <td><Typography fontWeight="bold">{row.name}</Typography></td>
                <td>{row.username}</td>
                <td>
                    <Chip size="sm" variant="soft" color={row.isPublic ? 'success' : 'neutral'}>
                        {row.isPublic ? <Public sx={{fontSize: 14}} /> : <PublicOff sx={{fontSize: 14}} />}
                        {row.isPublic ? ' Public' : ' Private'}
                    </Chip>
                </td>
                <td>{row.status}</td>
                <td>{row.score.toFixed(4)}</td>
                <td>
                    <IconButton size="sm" color="danger" onClick={() => onDelete(row.id)}>
                        <DeleteForever />
                    </IconButton>
                </td>
            </tr>
            <tr>
                <td style={{ height: 0, padding: 0 }} colSpan={7}>
                    {open && (
                        <Sheet variant="soft" sx={{ p: 3, m: 1, borderRadius: 'md', bgcolor: 'background.level1', border: '1px solid', borderColor: 'divider' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                <Typography level="title-lg">Submission Deep-Dive</Typography>
                                <Stack direction="row" spacing={1}>
                                    <Button 
                                        size="sm" 
                                        variant="soft" 
                                        color={row.isPublic ? "warning" : "success"}
                                        startDecorator={row.isPublic ? <PublicOff /> : <Public />}
                                        loading={toggling}
                                        onClick={handleToggleVisibility}
                                    >
                                        {row.isPublic ? "Hide from Rankings" : "Make Public"}
                                    </Button>
                                    <Button 
                                        size="sm" 
                                        variant="solid" 
                                        color="primary"
                                        startDecorator={<Visibility />}
                                        onClick={() => navigate("/rankings/detail", { state: row })}
                                    >
                                        View Full Report
                                    </Button>
                                </Stack>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />

                            <Grid container spacing={2}>
                                <Grid xs={12} md={8}>
                                    <Typography level="body-xs" fontWeight="bold">Model Description</Typography>
                                    <Typography level="body-sm" sx={{ whiteSpace: 'pre-wrap' }}>
                                        {row.metadata.description || "No description provided."}
                                    </Typography>
                                </Grid>
                                <Grid xs={12} md={4}>
                                    <Stack spacing={1}>
                                        <Box>
                                            <Typography level="body-xs" fontWeight="bold">Internal ID</Typography>
                                            <Typography level="body-sm" fontFamily="monospace">SUB-{row.id.toString().padStart(5, '0')}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography level="body-xs" fontWeight="bold">Research Institute</Typography>
                                            <Typography level="body-sm">{row.metadata.institute || "Independent"}</Typography>
                                        </Box>
                                        <Box>
                                            <Typography level="body-xs" fontWeight="bold">Datasets Evaluated</Typography>
                                            <Typography level="body-sm">{row.metadata.datasetCount} Datasets</Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                            </Grid>
                        </Sheet>
                    )}
                </td>
            </tr>
        </React.Fragment>
    );
};

const SubmissionManagement = () => {
    const [submissions, setSubmissions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteId, setDeleteId] = useState(null);
    const { showSnackbar } = useSnackbar();

    const fetchSubmissions = async () => {
        try {
            const res = await axios.get(`${API_BASE_URL}/admin/submissions`, { withCredentials: true });
            setSubmissions(res.data);
        } catch (err) { showSnackbar("Failed to fetch submissions", "danger"); }
    };

    useEffect(() => { fetchSubmissions(); }, []);

    const filteredSubmissions = submissions.filter(sub => 
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.username.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleDelete = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/admin/submissions/${deleteId}`, { withCredentials: true });
            showSnackbar("Submission deleted", "success");
            setDeleteId(null);
            fetchSubmissions();
        } catch (err) { showSnackbar("Delete failed", "danger"); }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography level="h2">Submission Management</Typography>
                <Input
                    placeholder="Search submission name or user..."
                    startDecorator={<SearchIcon />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    sx={{ width: 300 }}
                />
            </Box>
            <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto' }}>
                <Table>
                    <thead>
                        <tr>
                            <th style={{ width: 40 }} />
                            <th>Method Name</th>
                            <th>User</th>
                            <th>Visibility</th>
                            <th>Status</th>
                            <th>Score</th>
                            <th style={{ width: 80 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredSubmissions.map((sub) => (
                            <Row 
                                key={sub.id} 
                                row={sub} 
                                onDelete={setDeleteId} 
                                onRefresh={fetchSubmissions}
                            />
                        ))}
                        {filteredSubmissions.length === 0 && (
                            <tr>
                                <td colSpan={7} style={{ textAlign: 'center', padding: '20px' }}>
                                    No submissions found matching your search.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </Table>
            </Sheet>

            <Modal open={!!deleteId} onClose={() => setDeleteId(null)}>
                <ModalDialog variant="outlined" role="alertdialog">
                    <DialogTitle>Confirm Permanent Deletion</DialogTitle>
                    <DialogContent>
                        Are you sure you want to delete this submission?
                    </DialogContent>
                    <DialogActions>
                        <Button variant="solid" color="danger" onClick={handleDelete}>Delete Permanently</Button>
                        <Button variant="plain" color="neutral" onClick={() => setDeleteId(null)}>Cancel</Button>
                    </DialogActions>
                </ModalDialog>
            </Modal>
        </Box>
    );
};

export default SubmissionManagement;