import React, { useState } from 'react';
import { Button, Modal, ModalDialog, DialogTitle, Textarea, FormControl, FormLabel, Input, Stack } from '@mui/joy';
import { Send, ContactSupport } from '@mui/icons-material';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import { useSnackbar } from '../../contexts/SnackbarProvider';

export const ContactFormModal = ({ open, onClose, initialSubject = "" }) => {
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
            
            showSnackbar("Message sent to an admin! Sit tight :)", "success");
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
            </ModalDialog>
        </Modal>
    );
};

export default ContactFormModal;