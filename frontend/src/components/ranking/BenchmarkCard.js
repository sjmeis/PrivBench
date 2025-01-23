import { useState } from 'react';
import {
    Box,
    Card,
    Typography,
    Chip,
    Modal,
    ModalDialog,
    ModalClose,
    Divider, Button
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
                    minWidth: 150,
                    minHeight: 150,
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
                        level="h4"
                        sx={{
                            textAlign: 'center',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            flex: 1

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
                    <Divider/>
                    <Button color='neutral' variant='soft'>More Information</Button>
                </ModalDialog>
            </Modal>
        </>
    );
};

export default BenchmarkCard;