import React, {useState} from "react";
import {
    Box,
    Modal,
    Typography,
    Stack,
    Input,
    Button,
    Textarea,
    FormControl,
    Table,
    FormLabel,
    IconButton,
    Sheet,
    ModalClose,
    ModalDialog,
    DialogActions,
    DialogTitle, DialogContent,
} from "@mui/joy";
import InsertDriveFileRoundedIcon from "@mui/icons-material/InsertDriveFileRounded";
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import ArrowDropDownRoundedIcon from "@mui/icons-material/ArrowDropDownRounded";
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import {getDateString} from "../../utils/Date";
import AddDatasetsModal from "./AddDatasetsModal";
import {HiddenInput} from "../shared/HiddenInput";

const x = [
    {
        "createdAt": "2024-12-21T15:44:21.829939",
        "filePath": "/data/datasets/demo_original_3.csv",
        "id": 1,
        "isActive": true,
        "name": "demo_original_3.csv"
    },
    {
        "createdAt": "2024-12-21T15:44:21.861331",
        "filePath": "/data/datasets/demo_original_2.csv",
        "id": 2,
        "isActive": true,
        "name": "demo_original_2.csv"
    },
    {
        "createdAt": "2024-12-21T15:44:21.864924",
        "filePath": "/data/datasets/demo_original_1.csv",
        "id": 3,
        "isActive": true,
        "name": "demo_original_1.csv"
    }
]

const AddModuleModal = ({ isOpen, onClose, onSubmit }) => {
    const [isDSModalOpen, setIsDSModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        description: "",
        algorithmFile: null,
        selectedDatasets: x, // Initial datasets
        newDataset: "",
    });

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData({ ...formData, [name]: value });
    };

    const handleFileChange = (e) => {
        setFormData({ ...formData, algorithmFile: e.target.files[0] });
    };

    const handleDatasetSubmit = (selectedDatasets) => {
        setFormData({ ...formData, selectedDatasets });
        setIsDSModalOpen(false);
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();
        onSubmit(formData);
        onClose();
    };

    return (
        <Modal open={isOpen} onClose={onClose} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ModalDialog sx={{ width: 700 }}>
                <DialogTitle>Add New Benchmarking Module</DialogTitle>
                <DialogContent>
                    <Box>
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
                                <FormLabel>Description</FormLabel>
                                <Textarea
                                    minRows={5}
                                    name="description"
                                    type="text"
                                    value={formData.description}
                                    onChange={handleInputChange}
                                />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Upload Algorithm</FormLabel>
                                <Button
                                    variant="outlined"
                                    color="neutral"
                                    startDecorator={<CloudUploadIcon />}
                                >
                                    Upload a python file
                                    <HiddenInput
                                        type="file"
                                        accept=".py"
                                        onChange={handleFileChange}
                                    />
                                </Button>
                            </FormControl>
                        </Stack>
                        <Sheet
                            variant="outlined"
                            sx={{
                                marginTop: '25px',
                                borderRadius: 'sm',
                                gridColumn: '1/-1',
                                display: { xs: 'none', md: 'flex' },
                            }}
                        >
                            <Table
                                size="sm"
                                borderAxis="none"
                                variant="soft"
                                sx={{
                                    '--TableCell-paddingX': '0.5rem',
                                    '--TableCell-paddingY': '0.5rem',
                                    '--TableRow-height': '1.5rem',
                                }}
                            >
                                <thead>
                                <tr>
                                    <th style={{ width: '50%' }}>
                                        <Typography level="title-sm">Selected Dataset</Typography>
                                    </th>
                                    <th style={{ width: '40%' }}>
                                        <Typography level="title-sm" endDecorator={<ArrowDropDownRoundedIcon />}>
                                            Created At
                                        </Typography>
                                    </th>
                                    <th style={{ width: '10%' }}>
                                        <Button
                                            color="neutral"
                                            size="sm"
                                            onClick={() => setIsDSModalOpen(true)}
                                        >
                                            Add
                                        </Button>
                                    </th>
                                </tr>
                                </thead>
                                <tbody>
                                {formData.selectedDatasets.length > 0 ? (
                                    formData.selectedDatasets.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <Typography
                                                    level="title-sm"
                                                    startDecorator={<InsertDriveFileRoundedIcon color="primary" />}
                                                    sx={{ alignItems: 'flex-start' }}
                                                >
                                                    {item.name}
                                                </Typography>
                                            </td>
                                            <td>
                                                <Typography level="body-sm">{getDateString(item.createdAt)}</Typography>
                                            </td>
                                            <td>
                                                <IconButton
                                                    variant="soft"
                                                    sx={{ color: 'error.main' }}
                                                    onClick={() =>
                                                        setFormData({
                                                            ...formData,
                                                            selectedDatasets: formData.selectedDatasets.filter(
                                                                (dataset) => dataset.id !== item.id
                                                            ),
                                                        })
                                                    }
                                                >
                                                    <DeleteForeverIcon />
                                                </IconButton>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={3} style={{ textAlign: 'center' }}>
                                            <Typography level="body-sm" sx={{ color: 'text.secondary' }}>
                                                No Dataset selected yet
                                            </Typography>
                                        </td>
                                    </tr>
                                )}
                                </tbody>
                            </Table>
                        </Sheet>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button color="success" onClick={handleFormSubmit}>
                        Save New Benchmarking Module
                    </Button>
                </DialogActions>
                <ModalClose />
                <AddDatasetsModal
                    isOpen={isDSModalOpen}
                    onClose={() => setIsDSModalOpen(false)}
                    onSubmit={handleDatasetSubmit}
                />
            </ModalDialog>

        </Modal>
    );
};

export default AddModuleModal;
