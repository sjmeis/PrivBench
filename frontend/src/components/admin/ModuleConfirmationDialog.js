import {
    Box,
    Button,
    Chip,
    DialogActions,
    DialogContent,
    DialogTitle, Divider,
    Modal,
    ModalDialog,
    Stack,
    Typography
} from "@mui/joy";
import {DriveFileRenameOutline, InfoOutlined} from "@mui/icons-material";
import React from "react";
import ModelCardTextPairs from "../shared/ModelCardTextPairs";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const ModuleConfirmationDialog = ({isConfirmationOpen, handleCloseConfirmation, handleSaveConfirmation, module}) => {

    return (
        <Modal open={isConfirmationOpen} onClose={handleCloseConfirmation}>
            <ModalDialog sx={{maxWidth: '440px'}}>
                <DialogTitle>Confirm addition of new Benchmarking Module</DialogTitle>
                <Divider sx={{marginBottom: '10px'}}></Divider>
                <DialogContent>
                    <Stack spacing={2}>
                        <Typography sx={{maxWidth: '400px', p: 1}} startDecorator={<InfoOutlined/>} variant='soft'
                                    color='danger' level="body1">
                            Note: Adding a new Benchmarking Module will flag all existing user submissions as outdated. Users must update their submissions to keep them public.
                        </Typography>
                        <ModelCardTextPairs icon={<DriveFileRenameOutline/>} content={module.name}
                                            title={'Name'}/>
                        <ModelCardTextPairs icon={<InsertDriveFileIcon/>} content={module.algorithmFile?.name}
                                            title={'Algorithm File'}/>

                        <Box sx={{display: 'flex', flexWrap: 'wrap'}}>
                            <Typography level="body2" sx={{width: '100%'}}>
                                <ModelCardTextPairs
                                                    title={'Datasets: '}/>
                                    {[...module.selectedDatasets, ...module.uploadedDatasets].map((dataset) => (
                                        <Chip sx={{m: '2px'}} variant='outlined' key={dataset.id}>{dataset.name}</Chip>
                                    ))}
                            </Typography>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{marginTop: '10px'}}>
                    <Button color="neutral" onClick={handleCloseConfirmation}>
                        Cancel
                    </Button>
                    <Button color="success" onClick={handleSaveConfirmation}>
                        Confirm & Save
                    </Button>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
}

export default ModuleConfirmationDialog;