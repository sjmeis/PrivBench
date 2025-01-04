import React, { useState } from "react";
import { Box, Button, Card, Typography, CircularProgress } from "@mui/joy";
import { CloudUpload } from "@mui/icons-material";
import axios from "axios";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const UploadStep = ({ submissionId, datasets, uploadedFiles, onFileUploaded }) => {
    const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
    const { showSnackbar } = useSnackbar();

    const handleFileSelect = async (event, originalDatasetId) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingDatasetId(originalDatasetId);

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('submission_id', String(submissionId));
            formData.append('original_dataset_id', String(originalDatasetId));

            await axios.post(
                `http://localhost:5000/upload-privatized-dataset`,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                }
            );

            onFileUploaded(originalDatasetId, file.name);

            showSnackbar(`Successfully uploaded ${file.name}`, "success");
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Failed to upload file", "error");
        } finally {
            setUploadingDatasetId(null);
            event.target.value = '';
        }
    };

    return (
        <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Upload the Privatized Datasets
            </Typography>
            {/* ... Existing instructional content ... */}

            {datasets.map((dataset) => (
                <Box key={dataset.id} sx={{ mt: 4 }}>
                    <Typography level="h5" mb={2}>
                        Upload Privatized Dataset for {dataset.name}
                    </Typography>

                    <Button
                        component="label"
                        size="lg"
                        variant="soft"
                        startDecorator={
                            uploadingDatasetId === dataset.id ? <CircularProgress size="sm" /> : <CloudUpload />
                        }
                        sx={{ mt: 2 }}
                        disabled={uploadingDatasetId !== null}
                    >
                        {uploadedFiles[dataset.id] ? "Replace File" : "Upload File"}
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => handleFileSelect(e, dataset.id)}
                            style={{ display: "none" }}
                        />
                    </Button>

                    {uploadedFiles[dataset.id] && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Uploaded File: {uploadedFiles[dataset.id]}
                        </Typography>
                    )}
                </Box>
            ))}
        </Card>
    );
};

export default UploadStep;
