import { Box, Button, Typography, Modal, ModalDialog, DialogTitle, Divider, Stack, FormControl, FormLabel, Input, Select, Option } from "@mui/joy";
import DatasetTable from "./DatasetTable";
import {useEffect, useState} from "react";
import { DatasetService } from "../../services/DatasetService";
import AddIcon from "@mui/icons-material/Add";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import { API_BASE_URL } from '../../config';
import axios from 'axios';

const DatasetManagement = () => {
    const [datasets, setDatasets] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newDatasetName, setNewDatasetName] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const { showSnackbar } = useSnackbar();
    const [modules, setModules] = useState([]);
    const [selectedModuleIds, setSelectedModuleIds] = useState([]);

    const loadDatasets = () => {
        DatasetService.fetchAllDatasets()
            .then((data) => setDatasets(data))
            .catch((error) => console.error(error));
    };

    useEffect(() => { loadDatasets(); }, []);

    const handleUpload = async () => {
        if (!selectedFile || !newDatasetName) return;
        setIsUploading(true);
        try {
            await DatasetService.uploadDataset(selectedFile, newDatasetName);
            showSnackbar("Dataset uploaded successfully", "success");
            setIsModalOpen(false);
            setNewDatasetName("");
            setSelectedFile(null);
            loadDatasets();
        } catch (error) {
            showSnackbar("Failed to upload dataset", "error");
        } finally {
            setIsUploading(false);
        }
    };

    useEffect(() => {
        DatasetService.fetchAllDatasets()
            .then((data) => setDatasets(data))
            .catch((error) => console.error(error));
    }, []);

    useEffect(() => {
        if (isModalOpen) {
            axios.get(`${API_BASE_URL}/modules`)
                .then(res => setModules(res.data))
                .catch(err => console.error("Error fetching modules", err));
        }
    }, [isModalOpen]);

    return (<Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography level="h2">Dataset Management</Typography>
                <Button startDecorator={<AddIcon />} onClick={() => setIsModalOpen(true)}>
                    Add Dataset
                </Button>
            </Box>
        <DatasetTable datasets={datasets} onRefresh={loadDatasets}></DatasetTable>
        <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <ModalDialog sx={{ width: 400 }}>
                    <DialogTitle>Upload New Dataset</DialogTitle>
                    <Divider />
                    <Stack spacing={2} sx={{ mt: 2 }}>
                        <FormControl required>
                            <FormLabel>Dataset Name</FormLabel>
                            <Input 
                                placeholder="Dataset Name" 
                                value={newDatasetName}
                                onChange={(e) => setNewDatasetName(e.target.value)}
                            />
                        </FormControl>
                        <FormControl required>
                            <FormLabel>CSV File</FormLabel>
                            <Input 
                                type="file" 
                                slotProps={{ input: { accept: ".csv" } }}
                                onChange={(e) => setSelectedFile(e.target.files[0])}
                            />
                        </FormControl>
                        <FormControl>
                            <FormLabel>Module Mapping (Optional)</FormLabel>
                            <Select
                                multiple
                                placeholder="Select modules..."
                                value={selectedModuleIds}
                                onChange={(e, newValue) => setSelectedModuleIds(newValue)}
                            >
                                {modules.map((m) => (
                                    <Option key={m.id} value={m.id}>{m.name}</Option>
                                ))}
                            </Select>
                        </FormControl>
                        <Button loading={isUploading} onClick={handleUpload} disabled={!selectedFile || !newDatasetName}>
                            Confirm Upload
                        </Button>
                    </Stack>
                </ModalDialog>
            </Modal>
    </Box>)
}

export default DatasetManagement;