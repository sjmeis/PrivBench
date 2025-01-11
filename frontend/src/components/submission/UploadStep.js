import React, { useState } from "react";
import { Card, Typography } from "@mui/joy";
import axios from "axios";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import UploadTable from "./UploadTable"; // Import the new UploadTable component

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
                "http://localhost:5000/upload-privatized-dataset",
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
        <Card variant="outlined" sx={{ width: 1000, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Upload the privatized datasets
            </Typography>
            <Typography level="body1" sx={{ textAlign: "center", mb: 3 }}>
                Below is the list of datasets. Please upload the corresponding privatized dataset for each in .csv format.
            </Typography>

            <UploadTable
                datasets={datasets}
                uploadedFiles={uploadedFiles}
                uploadingDatasetId={uploadingDatasetId}
                onFileSelect={handleFileSelect}
            />
        </Card>
    );
};

export default UploadStep;






