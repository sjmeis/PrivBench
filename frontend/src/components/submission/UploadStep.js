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

import React, {useEffect, useState} from "react";
import { Box, Typography } from "@mui/joy";
import axios from "axios";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import UploadTable from "./UploadTable";
import { InfoOutlined } from "@mui/icons-material";
import { API_BASE_URL } from '../../config';

const UploadStep = ({ submissionId, datasets, uploadedFiles, onFileUploaded }) => {
    const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        localStorage.removeItem("tasks"); //clean past tasks from local storage
    }, []);

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
                `${API_BASE_URL}/upload-privatized-dataset`,
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
                For every dataset listed below there needs to be uploaded the privatized counterpart in .csv format. Make sure that you only alter the "text" column. The corresponding IDs should be left as is and in the same order!
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