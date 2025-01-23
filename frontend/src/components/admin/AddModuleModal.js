import React, {useEffect, useState} from "react";
import {
    Box,
    Modal,
    Typography,
    Stack,
    Input,
    Button,
    Textarea,
    FormControl,
    FormLabel,
    ModalClose,
    ModalDialog,
    DialogActions,
    DialogTitle,
    DialogContent,
    Divider,
} from "@mui/joy";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import AddDatasetsModal from "./AddDatasetsModal";
import ModuleConfirmationDialog from "./ModuleConfirmationDialog";
import {createBenchmarkingModule} from "../../services/ModuleService";
import AddModuleDatasetTable from "./AddModuleDatasetTable";

const AddModuleModal = ({isOpen, onClose, onSubmit, onError}) => {
    const [isDSModalOpen, setIsDSModalOpen] = useState(false);
    const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        algorithmFile: null,
        requirementsFile: null,
        selectedDatasets: [],
        uploadedDatasets: [],
    });

    useEffect(() => {
        setFormData({
            name: "",
            description: "",
            algorithmFile: null,
            requirementsFile: null,
            selectedDatasets: [],
            uploadedDatasets: [],
        })
    }, [isOpen]);

    const isFormValid = () => {
        return formData.name.trim() &&
            formData.description.trim() &&
            formData.algorithmFile &&
            (formData.selectedDatasets.length > 0 || formData.uploadedDatasets.length > 0);
    };

    const handleInputChange = (e) => {
        const {name, value} = e.target;
        setFormData({...formData, [name]: value});
    };

    const handleFileChange = (e) => {
        setFormData({...formData, algorithmFile: e.target.files[0]});
    };

    const handleDatasetSubmit = (selectedDataset, uploadedDataset) => {
        if (selectedDataset) {
            setFormData((prevFormData) => ({
                ...prevFormData,
                selectedDatasets: prevFormData.selectedDatasets.concat(selectedDataset),
            }));
        } else if (uploadedDataset) {
            setFormData((prevFormData) => ({
                ...prevFormData,
                uploadedDatasets: prevFormData.uploadedDatasets.concat(uploadedDataset),
            }));
        }
        setIsDSModalOpen(false);
    };

    const handleSubmit = async () => {
        try {
            const response = await createBenchmarkingModule(formData);
            console.log(response)
            onSubmit()
        } catch (err) {
            onError(err.message)
        } finally {
            onClose()
        }

    };

    const handleFormSubmit = (e) => {
        setIsConfirmationOpen(false)
        e.preventDefault();
        handleSubmit()
        console.log(formData)

    };

    const removeDataset = (id) => {
        setFormData({
            ...formData,
            selectedDatasets: formData.selectedDatasets.filter(
                (dataset) => dataset.id !== id
            ),
        })
    };

    const removeUploadedDataset = (id) => {
        setFormData({
            ...formData,
            uploadedDatasets: formData.uploadedDatasets.filter(
                (dataset) => dataset.id !== id
            ),
        })
    };

    const handleOpenConfirmation = () => {
        setIsConfirmationOpen(true);
    };

    const handleCloseConfirmation = () => {
        //todo: implement cleanup logic
        setIsConfirmationOpen(false);
    };


    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            sx={{display: "flex", alignItems: "center", justifyContent: "center"}}
        >
            <ModalDialog sx={{width: "90%", maxWidth: 1200}}>
                <DialogTitle>Add New Benchmarking Module</DialogTitle>
                <Divider sx={{marginBottom: "10px"}}/>

                <DialogContent>
                    <Box sx={{display: "flex", gap: 2, height: "100%"}}>
                        {/* General Information */}
                        <Box sx={{flex: 1, display: "flex", flexDirection: "column", gap: 2}}>
                            <Typography level="h5" fontWeight="bold">
                                Step 1: General Module Information
                            </Typography>
                            <Stack spacing={2}>
                                <FormControl required>
                                    <FormLabel>Name</FormLabel>
                                    <Input
                                        name="name"
                                        type="text"
                                        value={formData.name}
                                        onChange={handleInputChange}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel required>Description</FormLabel>
                                    <Textarea
                                        minRows={5}
                                        name="description"
                                        value={formData.description}
                                        onChange={handleInputChange}
                                    />
                                </FormControl>
                                <FormControl>
                                    <FormLabel required>Upload Algorithm</FormLabel>
                                    <Button
                                        variant="outlined"
                                        startDecorator={<CloudUploadIcon/>}
                                        component="label"
                                    >
                                        {formData.algorithmFile
                                            ? `Uploaded: ${formData.algorithmFile.name}`
                                            : 'Upload a python file'}

                                        <input
                                            type="file"
                                            accept=".py"
                                            hidden
                                            onChange={handleFileChange}
                                        />
                                    </Button>
                                </FormControl>
                                <FormControl>
                                <FormLabel>Requirements File</FormLabel>
                                <Button
                                    variant="outlined"
                                    startDecorator={<CloudUploadIcon/>}
                                    component="label"
                                >
                                    {formData.requirementsFile
                                        ? `Uploaded: ${formData.requirementsFile.name}`
                                        : 'Upload requirements.txt'}
                                    <input
                                        type="file"
                                        accept=".txt"
                                        hidden
                                        onChange={(e) => setFormData({...formData, requirementsFile: e.target.files[0]})}
                                    />
                                </Button>
                            </FormControl>
                            </Stack>
                        </Box>

                        <Divider orientation="vertical"/>

                        <Box sx={{flex: 1, display: "flex", flexDirection: "column", gap: 2}}>
                            <Typography level="h5" fontWeight="bold">
                                Step 2: Dataset Configuration
                            </Typography>
                            {formData && <AddModuleDatasetTable formData={formData}
                                                                removeDataset={removeDataset}
                                                                removeUploadedDataset={removeUploadedDataset}/>}
                            <Button
                                variant="soft"
                                onClick={() => setIsDSModalOpen(true)}
                                fullWidth
                            >
                                Add Datasets
                            </Button>
                        </Box>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button disabled={!isFormValid()} color="success" onClick={handleOpenConfirmation}>
                        Save Module
                    </Button>
                </DialogActions>
                <ModalClose/>
                <AddDatasetsModal
                    isOpen={isDSModalOpen}
                    onClose={() => setIsDSModalOpen(false)}
                    onSubmit={handleDatasetSubmit}
                />
                <ModuleConfirmationDialog handleSaveConfirmation={handleFormSubmit}
                                          handleCloseConfirmation={handleCloseConfirmation}
                                          isConfirmationOpen={isConfirmationOpen} module={formData}/>
            </ModalDialog>
        </Modal>
    );
};

export default AddModuleModal;
