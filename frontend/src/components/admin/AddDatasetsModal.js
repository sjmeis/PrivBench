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
import {fetchAllDatasets} from "../../services/DatasetService";
import { Close,} from "@mui/icons-material";

const AddDatasetsModal = ({isOpen, onClose, onSubmit}) => {
    const [datasets, setDatasets] = useState([]);
    const [selectedDataset, setSelectedDataset] = useState();
    const [uploadedDataset, setUploadedDataset] = useState(null);

    const handleFileChange = (e) => {
        setUploadedDataset(e.target.files[0])
    };

    useEffect(() => {
        fetchAllDatasets()
            .then((datasets) => setDatasets(datasets))//todo: filter out already selected datasets
            .catch((error) => console.error(error));
    }, []);

    useEffect(() => {
        if (isOpen) {
            setSelectedDataset([]);
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
                                    disabled={uploadedDataset}
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
                                {selectedDataset && <IconButton onClick={() => setSelectedDataset(null)} color='danger'
                                                            variant='outlined'><Close/></IconButton>}
                            </Stack>
                        </FormControl>
                        <Divider>or</Divider>
                        {/*//fixme: implement upload functionality*/}
                        <FormControl>
                            <FormLabel>Upload New Dataset</FormLabel>
                            <Stack direction='row' spacing={1}>
                                <Button disabled={selectedDataset}
                                        fullWidth
                                        component="label"
                                        variant="outlined"
                                        color="neutral"
                                        startDecorator={<CloudUploadIcon/>}
                                >
                                    {uploadedDataset
                                        ? `Uploaded: ${uploadedDataset.name}`
                                        : 'Upload a csv file'}
                                    <input type="file" accept=".csv" hidden onChange={handleFileChange}/>
                                </Button>
                                {uploadedDataset && <IconButton onClick={() => setUploadedDataset(null)} color='danger'
                                                            variant='outlined'><Close/></IconButton>}
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
                        <Button variant="outlined" onClick={onClose}>
                            Cancel
                        </Button>
                        <Button disabled={!isFormValid()} variant="solid" onClick={handleSave}>
                            Save
                        </Button>
                    </Stack>
                </DialogActions>
            </ModalDialog>
        </Modal>
    );
};

export default AddDatasetsModal;
