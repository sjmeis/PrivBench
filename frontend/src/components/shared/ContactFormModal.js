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


import React, { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { Button, Modal, ModalDialog, DialogTitle, Textarea, FormControl, FormLabel, Input, Stack } from '@mui/joy';
import { Send } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useSnackbar } from '../../contexts/SnackbarProvider';
import { useAuth } from '../../contexts/AuthContext';
import { Alert } from '@mui/joy';
import { InfoOutlined } from '@mui/icons-material';

export const ContactFormModal = ({ open, onClose, initialSubject = "" }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [subject, setSubject] = useState(initialSubject);
    const [message, setMessage] = useState('');
    const { showSnackbar } = useSnackbar();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/support/contact`, { 
                subject: subject || "No Subject", 
                message 
            }, { withCredentials: true });
            
            showSnackbar("Message sent to an admin. Thank you! Now just sit tight :)", "success");
            setMessage('');
            onClose();
        } catch (err) {
            showSnackbar("Failed to send message.", "danger");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal open={open} onClose={onClose}>
            <ModalDialog sx={{ width: 400 }}>
                <DialogTitle>Contact PrivBench</DialogTitle>
                {!user ? (
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <Alert color="warning" variant="soft" startDecorator={<InfoOutlined />}>
                            You must be logged in to send a support request so we can get back to you.
                        </Alert>
                        <Button onClick={() => { onClose(); navigate('/login'); }}>
                            Go to Login
                        </Button>
                    </Stack>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <Stack spacing={2}>
                            <FormControl>
                                <FormLabel>Subject</FormLabel>
                                <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Limit Increase / Bug Report / etc." />
                            </FormControl>
                            <FormControl required>
                                <FormLabel>Message</FormLabel>
                                <Textarea 
                                    minRows={4} 
                                    value={message} 
                                    onChange={(e) => setMessage(e.target.value)} 
                                    placeholder="How can we help you?" 
                                />
                            </FormControl>
                            <Button type="submit" loading={loading} endDecorator={<Send />}>
                                Send Message
                            </Button>
                        </Stack>
                    </form>
                )}
            </ModalDialog>
        </Modal>
    );
};

export default ContactFormModal;