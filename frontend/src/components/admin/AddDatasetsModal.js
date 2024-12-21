import {
    Button, DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormLabel,
    Modal,
    ModalDialog,
    Option,
    Select,
    Stack,
} from "@mui/joy";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import React, { useEffect, useState } from "react";
import { fetchAllDatasets } from "../../services/DatasetService";
import { HiddenInput } from "../shared/HiddenInput";

const AddDatasetsModal = ({ isOpen, onClose, onSubmit }) => {
    const [datasets, setDatasets] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        algorithmFile: null,
        selectedDatasets: [],
        newDataset: "",
    });

    useEffect(() => {
        fetchAllDatasets()
            .then((datasets) => setDatasets(datasets))
            .catch((error) => console.error(error));
    }, []);

    const handleFileChange = (e) => {
        setFormData({ ...formData, algorithmFile: e.target.files[0] });
    };

    const handleDatasetSelect = (e, newValue) => {
        const selectedValues = newValue.map((option) => option.name);
        setFormData({ ...formData, selectedDatasets: selectedValues });
    };

    const handleSave = () => {
        onSubmit(formData);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ModalDialog sx={{ width: 500 }}>
                <DialogTitle>Add Dataset</DialogTitle>
                <DialogContent>
                    <Stack spacing={2}>
                        <FormControl>
                            <FormLabel>Select Existing Datasets</FormLabel>
                            <Select
                                multiple
                                placeholder="Choose datasets"
                                value={formData.selectedDatasets}
                                onChange={handleDatasetSelect}
                                renderValue={(selected) => selected.join(", ")}
                            >
                                {datasets.map((dataset) => (
                                    <Option key={dataset.id} value={dataset.name}>
                                        {dataset.name}
                                    </Option>
                                ))}
                            </Select>
                        </FormControl>
                        <Divider>or</Divider>
                        <FormControl>
                            <FormLabel>Upload New Dataset</FormLabel>
                            <Button
                                component="label"
                                variant="outlined"
                                color="neutral"
                                startDecorator={<CloudUploadIcon />}
                            >
                                Upload a csv file
                                <HiddenInput type="file" accept=".csv" onChange={handleFileChange} />
                            </Button>
                        </FormControl>
                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Stack
                        direction="row"
                        spacing={2}
                        sx={{ justifyContent: "flex-end", alignItems: "center" }}
                    >
                        <Button variant="outlined" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button variant="solid" onClick={handleSave}>
                            Save
                        </Button>
                    </Stack>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
};

export default AddDatasetsModal;
