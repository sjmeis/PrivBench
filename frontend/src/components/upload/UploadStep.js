import React, { useState} from "react";
import { Box, Button, Card, IconButton, Typography, CircularProgress } from "@mui/joy";
import { CloudUpload, Delete, Warning } from "@mui/icons-material";
import axios from "axios";

const UploadStep = ({ storedFiles, handleFileChange, handleDeleteFile, submissionId, originalDatasetId }) => {

    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState(null);

    const handleFileSelect = async (event) => {
        const files = event.target.files;
        if (!files.length) return;

        setUploading(true);
        setError(null);

        try {
            // Upload each file
            for (let file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('submission_id', String(submissionId));
                formData.append('original_dataset_id', String(originalDatasetId));

                await axios.post(
                    `${process.env.REACT_APP_API_URL}/upload-privatized-dataset`,
                    formData,
                    {
                        headers: {
                            'Content-Type': 'multipart/form-data',
                        },
                    }
                );
            }

            // Call parent's handleFileChange to update UI
            if (handleFileChange) {
                handleFileChange(event);
            }
        } catch (error) {
            console.error("Error uploading file:", error);
            setError(error.response?.data?.error || "Failed to upload file");
        } finally {
            setUploading(false);
            event.target.value = '';
        }
    };

    return (
        <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Upload the privatized datasets
            </Typography>

            <Typography level="h4" mb={4}>
                In this step, you need to upload the privatized datasets. Please follow these instructions carefully:
            </Typography>

            <Typography level="body2" mb={2}>
                1. Click the <strong>Upload</strong> button to select and upload a <code>.csv</code> file corresponding to each of the datasets you previously downloaded and privatized. Ensure that the files are in the correct format and contain the expected data structure.
            </Typography>

            <Typography level="body2" mb={2}>
                2. After selecting the file, verify that it meets the required specifications and is ready for submission.
            </Typography>

            <Typography level="body2" mb={2}>
                3. Once the upload is complete, click the <strong>Submit</strong> button to finalize your submission. Your submission will then be evaluated based on the uploaded file.
            </Typography>

            <Typography level="h4" mb={2}>
                Make sure all the necessary steps are completed before submitting, as the evaluation will be based on the file you upload.
            </Typography>

            {error && (
                <Box sx={{ 
                    backgroundColor: "error.softBg", 
                    p: 2, 
                    borderRadius: 1,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1
                }}>
                    <Warning color="error" />
                    <Typography color="error">{error}</Typography>
                </Box>
            )}

            {/* Upload button */}
            <Button
                component="label"
                size="lg"
                variant="soft"
                startDecorator={uploading ? <CircularProgress size="sm" /> : <CloudUpload />}
                sx={{ mt: 2 }}
                disabled={uploading}
            >
                Upload files
                <input
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={handleFileSelect}
                    style={{ display: "none" }}
                />
            </Button>

            {/* Uploaded files list */}
            {storedFiles.length > 0 && (
                <Box sx={{ mt: 4 }}>
                    <Typography level="h4" mb={2}>
                        Uploaded Files
                    </Typography>
                    {storedFiles.map((file, index) => (
                        <Box key={index} display="flex" alignItems="center" mt={1}>
                            <Typography variant="body2" color="text.primary" sx={{ flexGrow: 1 }}>
                                {file.name}
                            </Typography>
                            <IconButton
                                size="small"
                                onClick={() => handleDeleteFile(file.name)}
                            >
                                <Delete fontSize="md" />
                            </IconButton>
                        </Box>
                    ))}
                </Box>
            )}
        </Card>
    );
};

export default UploadStep;