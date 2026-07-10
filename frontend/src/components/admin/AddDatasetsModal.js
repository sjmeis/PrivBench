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
    Button, DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormLabel, IconButton,
    Modal, ModalClose,
    ModalDialog,
    Option,
    Select,
    Stack,
} from "@mui/joy";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import React, {useEffect, useState} from "react";
import { DatasetService } from "../../services/DatasetService";
import {Cancel, Close, Save} from "@mui/icons-material";

const AddDatasetsModal = ({isOpen, onClose, onSubmit}) => {
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState(null);
    const [uploadedDataset, setUploadedDataset] = useState(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedDataset(e.target.files[0]);
        }
    };

    useEffect(() => {
        if (isOpen) {
            DatasetService.fetchAllDatasets()
                .then(data => setDatasets(data))
                .catch(error => console.error('Error fetching datasets:', error));
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setSelectedDataset(null);
            setUploadedDataset(null);
        }
    }, [isOpen]);

    const handleSave = () => {
        onSubmit(selectedDataset, uploadedDataset);
        onClose();
    };

    const isFormValid = () => {
        return uploadedDataset || selectedDataset;
    }

    return (
        <Modal open={isOpen} onClose={onClose} sx={{display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            <ModalDialog sx={{width: 500}}>
                <ModalClose/>
                <DialogTitle>Add Dataset</DialogTitle>
                <Divider sx={{marginBottom: "10px"}}/>
                <DialogContent>
                    <Stack spacing={2}>
                        <FormControl>
                            <FormLabel>Select Existing Datasets</FormLabel>
                            <Stack direction='row' spacing={1}>
                                <Select
                                    sx={{width: '100%'}}
                                    disabled={Boolean(uploadedDataset)}
                                    value={selectedDataset}
                                    onChange={(e, newValue) => setSelectedDataset(newValue)}
                                    placeholder="Choose datasets"
                                >
                                    {datasets.map((dataset) => (
                                        <Option key={dataset.id} value={dataset}>
                                            {dataset.name}
                                        </Option>
                                    ))}
                                </Select>
                                {selectedDataset && (
                                    <IconButton 
                                        onClick={() => setSelectedDataset(null)} 
                                        color='danger'
                                        variant='outlined'
                                    >
                                        <Close/>
                                    </IconButton>
                                )}
                            </Stack>
                        </FormControl>
                        <Divider>or</Divider>
                        <FormControl>
                            <FormLabel>Upload New Dataset</FormLabel>
                            <Stack direction='row' spacing={1}>
                                <Button
                                    disabled={Boolean(selectedDataset)}
                                    fullWidth
                                    component="label"
                                    variant="outlined"
                                    color="neutral"
                                    startDecorator={<CloudUploadIcon/>}
                                >
                                    {uploadedDataset 
                                        ? `Uploaded: ${uploadedDataset.name}`
                                        : 'Upload a csv file'}
                                    <input 
                                        type="file" 
                                        accept=".csv" 
                                        hidden 
                                        onChange={handleFileChange}
                                        onClick={(e) => {
                                            // Reset the value to allow selecting the same file again
                                            e.target.value = '';
                                        }}
                                    />
                                </Button>
                                {uploadedDataset && (
                                    <IconButton 
                                        onClick={() => setUploadedDataset(null)} 
                                        color='danger'
                                        variant='outlined'
                                    >
                                        <Close/>
                                    </IconButton>
                                )}
                            </Stack>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{justifyContent: "flex-end", alignItems: "center"}}
                    >
                        <Button variant="outlined" onClick={onClose} startDecorator={<Cancel />}>
                            Cancel
                        </Button>
                        <Button disabled={!isFormValid()} variant="solid" onClick={handleSave} endDecorator={<Save />}>
                            Save
                        </Button>
                    </Stack>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
};

export default AddDatasetsModal;