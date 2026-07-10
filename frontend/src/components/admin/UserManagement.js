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


import React, { useState, useEffect, useMemo } from 'react';
import { 
    Box, Table, Typography, Sheet, Input, IconButton, Select, 
    Option, Button, Modal, ModalDialog, DialogTitle, DialogContent, DialogActions, Divider
} from '@mui/joy';
import { 
    Check, Edit, Close, DeleteForever, ArrowUpward, ArrowDownward, Search 
} from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useSnackbar } from '../../contexts/SnackbarProvider';

const UserManagement = () => {
const [users, setUsers] = useState([]);
    const [days, setDays] = useState(30);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [deleteModalId, setDeleteModalId] = useState(null);
    
    const [sortConfig, setSortConfig] = useState({ key: 'username', direction: 'asc' });

    const { showSnackbar } = useSnackbar();

    const fetchUsers = async () => {
        try {
            const response = await axios.get(`${API_BASE_URL}/admin/users?days=${days}`, { withCredentials: true });
            setUsers(response.data);
        } catch (err) {
            showSnackbar("Failed to fetch users", "danger");
        }
    };

    useEffect(() => { fetchUsers(); }, [days]);

    const sortedUsers = useMemo(() => {
        let sortableUsers = [...users];

        if (searchTerm) {
            sortableUsers = sortableUsers.filter(u => 
                u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                u.mailAddress.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        sortableUsers.sort((a, b) => {
            if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
            if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return sortableUsers;
    }, [users, sortConfig, searchTerm]);

    const requestSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleUpdateLimit = async (userId) => {
        try {
            await axios.put(`${API_BASE_URL}/admin/users/${userId}/limit`, 
                { dailyLimit: editValue }, { withCredentials: true }
            );
            showSnackbar("Limit updated", "success");
            setEditingId(null);
            fetchUsers();
        } catch (err) { showSnackbar("Update failed", "danger"); }
    };

    const handleDeleteUser = async () => {
        try {
            await axios.delete(`${API_BASE_URL}/user/admin-delete/${deleteModalId}`, { withCredentials: true });
            showSnackbar("User deleted successfully", "success");
            setDeleteModalId(null);
            fetchUsers();
        } catch (err) {
            showSnackbar("Failed to delete user", "danger");
        }
    };

    const SortIcon = ({ colKey }) => {
        if (sortConfig.key !== colKey) return null;
        return sortConfig.direction === 'asc' ? <ArrowUpward sx={{ fontSize: 16 }} /> : <ArrowDownward sx={{ fontSize: 16 }} />;
    };

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography level="h2">User Management</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Input 
                        startDecorator={<Search />} 
                        placeholder="Search users..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <Select value={days} onChange={(_, v) => setDays(v)}>
                        <Option value={7}>Last 7 Days</Option>
                        <Option value={30}>Last 30 Days</Option>
                        <Option value={365}>Last Year</Option>
                    </Select>
                </Box>
            </Box>

            <Sheet variant="outlined" sx={{ borderRadius: 'sm', overflow: 'auto', maxHeight: '70vh' }}>
                <Table stickyHeader hoverRow>
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('username')} style={{ cursor: 'pointer' }}>Username <SortIcon colKey="username" /></th>
                            <th>Institute</th>
                            <th onClick={() => requestSort('totalSubmissions')} style={{ cursor: 'pointer' }}>Total Submissions<SortIcon colKey="totalSubmissions" /></th>
                            <th onClick={() => requestSort('recentSubmissions')} style={{ cursor: 'pointer' }}>Recent Submissions<SortIcon colKey="recentSubmissions" /></th>
                            <th style={{ width: 140 }}>Daily Limit</th>
                            <th style={{ width: 100 }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {sortedUsers.map((user) => (
                            <tr key={user.id}>
                                <td>{user.username}</td>
                                <td>{user.researchInstitute || '-'}</td>
                                <td>{user.totalSubmissions}</td>
                                <td>{user.recentSubmissions}</td>
                                <td>
                                    {editingId === user.id ? (
                                        <Input 
                                            autoFocus
                                            type="number" 
                                            size="sm" 
                                            value={editValue} 
                                            onChange={(e) => setEditValue(e.target.value)}
                                            endDecorator={
                                                <IconButton size="sm" color="success" onClick={() => handleUpdateLimit(user.id)}><Check /></IconButton>
                                            }
                                        />
                                    ) : (
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {user.dailyLimit}
                                            <IconButton size="sm" variant="plain" onClick={() => { setEditingId(user.id); setEditValue(user.dailyLimit); }}><Edit fontSize="small" /></IconButton>
                                        </Box>
                                    )}
                                </td>
                                <td>
                                    <IconButton size="sm" color="danger" variant="soft" onClick={() => setDeleteModalId(user.id)}>
                                        <DeleteForever />
                                    </IconButton>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            </Sheet>

            <Modal open={!!deleteModalId} onClose={() => setDeleteModalId(null)}>
                <ModalDialog variant="outlined" role="alertdialog">
                    <DialogTitle><DeleteForever color="danger" /> Confirm Deletion</DialogTitle>
                    <Divider />
                    <DialogContent>Are you sure you want to delete this user? This action cannot be undone.</DialogContent>
                    <DialogActions>
                        <Button variant="solid" color="danger" onClick={handleDeleteUser}>Delete User</Button>
                        <Button variant="plain" color="neutral" onClick={() => setDeleteModalId(null)}>Cancel</Button>
                    </DialogActions>
                </ModalDialog>
            </Modal>
        </Box>
    );
};

export default UserManagement;