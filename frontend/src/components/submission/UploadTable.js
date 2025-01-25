import React, { useState } from "react";
import { Box, Button, CircularProgress } from "@mui/joy";
import { CloudUpload } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const UploadTable = ({ datasets, uploadedFiles, uploadingDatasetId, onFileSelect }) => {
    const { showSnackbar } = useSnackbar();

    const [uploadedDatasetDimensions, setUploadedDatasetDimensions] = useState({});

    const handleFileSelect = (e, datasetId) => {
        const file = e.target.files[0];

        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                const text = reader.result;
                const rows = text.split("\n");
                const columns = rows[0].split(",").length;

                // Store the calculated dimensions of the uploaded file
                    setUploadedDatasetDimensions(prevState => ({
                    ...prevState,
                    [datasetId]: {
                        rows: rows.length,
                        columns
                    }
                }));

                // Find original dataset dimensions
                const originalDataset = datasets.find((dataset) => dataset.id === datasetId);
                const originalDimensions = { rows: originalDataset.rows, columns: originalDataset.columns };

                // Check if dimensions match
                if (
                    rows.length !== originalDimensions.rows ||
                    columns !== originalDimensions.columns
                ) {
                    showSnackbar(
                        "Error! Please make sure to upload the correct file!",
                        "error"
                    );
                    return;
                }

                // Proceed with file selection if dimensions match
                onFileSelect(e, datasetId);
            };
            reader.readAsText(file);
        }
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%", border: "1px solid #e0e0e0", borderRadius: 2 }}>
            <Box sx={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #e0e0e0", fontWeight: "bold" }}>
                <Box sx={{ flex: 1 }}>Original Dataset</Box>
                <Box sx={{ flex: 1 }}>Uploaded Dataset</Box>
                <Box sx={{ flex: 1, textAlign: "center" }}>Actions</Box>
            </Box>

            {datasets.map((dataset) => {
                const uploadedDimensions = uploadedDatasetDimensions[dataset.id];
                const originalDimensions = { rows: dataset.rows, columns: dataset.columns };

                return (
                    <Box key={dataset.id} sx={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #e0e0e0" }}>
                        <Box sx={{ flex: 1 }}>
                            {dataset.name}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            {uploadedFiles[dataset.id] || "Not Uploaded"}
                            {uploadedDimensions && uploadedDimensions.rows !== originalDimensions.rows}
                            {uploadedDimensions && uploadedDimensions.rows === originalDimensions.rows}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Box display="flex" justifyContent="center" alignItems="center">
                                <Button
                                    component="label"
                                    size="lg"
                                    variant="soft"
                                    startDecorator={uploadingDatasetId === dataset.id ? <CircularProgress size="sm" /> : <CloudUpload />}
                                >
                                    {uploadedFiles[dataset.id] ? "Replace File" : "Upload File"}
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={(e) => handleFileSelect(e, dataset.id)}
                                        style={{ display: "none" }}
                                    />
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};

export default UploadTable;
