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
import {Cancel, DriveFileRenameOutline, InfoOutlined, Save} from "@mui/icons-material";
import React from "react";
import ModelCardTextPairs from "../shared/ModelCardTextPairs";
import InsertDriveFileIcon from "@mui/icons-material/InsertDriveFile";

const ModuleConfirmationDialog = ({isConfirmationOpen, handleCloseConfirmation, handleSaveConfirmation, module, allDatasets = []}) => {

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

                        <Box sx={{ display: 'flex', flexWrap: 'wrap', flexDirection: 'column', gap: 1 }}>
                            <Typography level="body-sm" sx={{ fontWeight: 'bold' }}>
                                Datasets to link:
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {module.selectedDatasetIds && module.selectedDatasetIds.length > 0 ? (
                                    module.selectedDatasetIds.map((id) => {
                                        const ds = allDatasets.find(d => d.id === id);
                                        return (
                                            <Chip variant='outlined' color="primary" key={id}>
                                                {ds?.name || `ID: ${id}`}
                                            </Chip>
                                        );
                                    })
                                ) : (
                                    <Typography level="body-xs" sx={{ fontStyle: 'italic', color: 'text.tertiary' }}>
                                        No datasets selected
                                    </Typography>
                                )}
                            </Box>
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{marginTop: '10px'}}>
                    <Button color="success" onClick={handleSaveConfirmation} endDecorator={<Save />}>
                        Confirm & Save
                    </Button>
                    <Button color="neutral" onClick={handleCloseConfirmation} startDecorator={<Cancel />}>
                        Cancel
                    </Button>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
}

export default ModuleConfirmationDialog;