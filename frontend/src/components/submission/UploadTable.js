import React from "react";
import { Box, Button, CircularProgress } from "@mui/joy";
import { CloudUpload } from "@mui/icons-material";

const UploadTable = ({ datasets, uploadedFiles, uploadingDatasetId, onFileSelect }) => {
    return (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%", border: "1px solid #e0e0e0", borderRadius: 2 }}>
            <Box sx={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #e0e0e0", fontWeight: "bold" }}>
                <Box sx={{ flex: 1 }}>Original Dataset</Box>
                <Box sx={{ flex: 1 }}>Uploaded Dataset</Box>
                <Box sx={{ flex: 1, textAlign: "center" }}>Actions</Box>
            </Box>

            {datasets.map((dataset) => (
                <Box key={dataset.id} sx={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #e0e0e0" }}>
                    <Box sx={{ flex: 1 }}>{dataset.name}</Box>
                    <Box sx={{ flex: 1 }}>{uploadedFiles[dataset.id] || "Not Uploaded"}</Box>
                    <Box sx={{ flex: 1 }}>
                        <Box display="flex" justifyContent="center" alignItems="center">
                            <Button
                                component="label"
                                size="lg"
                                variant="soft"
                                startDecorator={
                                    uploadingDatasetId === dataset.id ? (
                                        <CircularProgress size="sm" />
                                    ) : (
                                        <CloudUpload />
                                    )
                                }
                            >
                                {uploadedFiles[dataset.id] ? "Replace File" : "Upload File"}
                                <input
                                    type="file"
                                    accept=".csv"
                                    onChange={(e) => onFileSelect(e, dataset.id)}
                                    style={{ display: "none" }}
                                />
                            </Button>
                        </Box>
                    </Box>
                </Box>
            ))}
        </Box>
    );
};

export default UploadTable;
