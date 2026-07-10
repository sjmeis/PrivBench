/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

import React from "react";
import { Box, Button, CircularProgress } from "@mui/joy";
import { CloudUpload } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const UploadTable = ({ datasets, uploadedFiles, uploadingDatasetId, onFileSelect }) => {
    const { showSnackbar } = useSnackbar();

    const handleFileSelect = (e, datasetId) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.name.endsWith(".csv")) {
            showSnackbar("Invalid file type. Only CSV files are allowed.", "error");
            return;
        }

        // Let the backend validate dimensions against the original dataset
        onFileSelect(e, datasetId);
    };

    return (
        <Box sx={{ display: "flex", flexDirection: "column", width: "100%", border: "1px solid #e0e0e0", borderRadius: 2 }}>
            <Box sx={{ display: "flex", padding: "8px 16px", borderBottom: "1px solid #e0e0e0", fontWeight: "bold" }}>
                <Box sx={{ flex: 1 }}>Original Dataset</Box>
                <Box sx={{ flex: 1 }}>Uploaded Dataset</Box>
                <Box sx={{ flex: 1, paddingRight: 1, textAlign: "end" }}>Actions</Box>
            </Box>

            {datasets.map((dataset) => {
                return (
                    <Box key={dataset.id} sx={{ display: "flex", alignItems: "center", padding: "8px 16px", borderBottom: "1px solid #e0e0e0" }}>
                        <Box sx={{ flex: 1 }}>
                            {dataset.name}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            {uploadedFiles[dataset.id] || "Not Uploaded"}
                        </Box>

                        <Box sx={{ flex: 1 }}>
                            <Box display="flex" justifyContent="end" alignItems="center">
                                <Button
                                    component="label"
                                    size="sm"
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
