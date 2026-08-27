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

import { useState } from 'react';
import {
    Box,
    Card,
    Typography,
    Chip,
    Modal,
    ModalDialog,
    ModalClose,
    Divider
} from '@mui/joy';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

const BenchmarkCard = ({ title, description }) => {
    const [modalOpen, setModalOpen] = useState(false);

    return (
        <>
            <Box
                onClick={() => setModalOpen(true)}
                sx={{
                    width: '100%',
                    height: '100%',
                    minWidth: 120,
                    minHeight: 120,
                    aspectRatio: '1 / 1',
                }}
            >
                <Card
                    variant="soft"
                    sx={{
                        height: '100%',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            borderColor: 'primary.500',
                            transform: 'translateY(-4px)',
                            boxShadow: 'sm'
                        },
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        gap: 2,
                        padding: 2,
                    }}
                >
                    <Typography
                        level="title-sm"
                        sx={{
                            textAlign: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.85rem',
                            lineHeight: 1.3,
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            wordBreak: 'break-word',
                            overflowWrap: 'anywhere',
                            my: 'auto',
                        }}
                    >
                        {title}
                    </Typography>

                    <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                        <Chip
                            startDecorator={<InfoIcon />}
                            variant="soft"
                            size="sm"
                        >
                            Info
                        </Chip>
                    </Box>
                </Card>
            </Box>

            <Modal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            >
                <ModalDialog
                    variant="outlined"
                    role="alertdialog"
                    aria-labelledby="modal-title"
                    aria-describedby="modal-desc"
                    sx={{
                        maxWidth: 500,
                        borderRadius: 'md',
                        p: 3,
                        boxShadow: 'lg',
                    }}
                >
                    <ModalClose />
                    <Typography
                        id="modal-title"
                        level="h2"
                        startDecorator={<CheckCircleIcon />}
                        sx={{ mb: 2, paddingRight: 2 }}
                    >
                        {title}
                    </Typography>
                    <Divider />
                    <Typography
                        id="modal-desc"
                        level="body1"
                        sx={{ mt: 2 }}
                    >
                        {description}
                    </Typography>
                </ModalDialog>
            </Modal>
        </>
    );
};

export default BenchmarkCard;