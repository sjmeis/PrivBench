import React, { useState } from "react";
import { Box, Typography } from "@mui/joy";
import axios from "axios";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import UploadTable from "./UploadTable";
import { InfoOutlined } from "@mui/icons-material";

const UploadStep = ({ submissionId, datasets, uploadedFiles, onFileUploaded }) => {
    const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
    const { showSnackbar } = useSnackbar();

    const handleFileSelect = async (event, originalDatasetId) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingDatasetId(originalDatasetId);

        try {
            const formData = new FormData();
            formData.append("file", file);
            formData.append("submission_id", String(submissionId));
            formData.append("original_dataset_id", String(originalDatasetId));

            await axios.post(
                "http://localhost:5000/upload-privatized-dataset",
                formData,
                {
                    headers: {
                        "Content-Type": "multipart/form-data",
                    },
                }
            );

            onFileUploaded(originalDatasetId, file.name);
            showSnackbar(`Successfully uploaded ${file.name}`, "success");
        } catch (error) {
            showSnackbar(error.response?.data?.error || "Failed to upload file", "error");
        } finally {
            setUploadingDatasetId(null);
            event.target.value = "";
        }
    };

    return (
        <Box>
            <Typography level="h2" mb={2}>
                Upload the privatized datasets
            </Typography>
            <Typography sx={{ marginY: 2, p: 1 }} startDecorator={<InfoOutlined />} variant="soft" color="neutral" level="body1">
                For every dataset listed below there needs to be uploaded the privatized counterpart in .csv format
            </Typography>

            <UploadTable
                datasets={datasets}
                uploadedFiles={uploadedFiles}
                uploadingDatasetId={uploadingDatasetId}
                onFileSelect={handleFileSelect}
            />
        </Box>
    );
};

export default UploadStep;