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

import React, { useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/joy";
import { CloudDownload, InfoOutlined } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import DatasetsTable from "./DatasetTable";
import { DatasetService } from "../../services/DatasetService";

const DownloadStep = ({ datasets }) => {
    const [selectedDatasets, setSelectedDatasets] = useState([]);
    const [downloadedDatasets, setDownloadedDatasets] = useState(new Set());
    const { showSnackbar } = useSnackbar();

    const handleToggleSelect = (datasetName) => {
        setSelectedDatasets((prevSelected) =>
            prevSelected.includes(datasetName)
                ? prevSelected.filter((name) => name !== datasetName)
                : [...prevSelected, datasetName]
        );
    };

    const handleSelectAll = (checked) => {
        setSelectedDatasets(checked ? datasets.map((dataset) => dataset.name) : []);
    };

    const handleDownloadSelected = () => {
        DatasetService.downloadDatasets(selectedDatasets)
            .then(() => {
                showSnackbar("Selected datasets were downloaded successfully!", "success");
                setDownloadedDatasets((prev) => new Set([...prev, ...selectedDatasets]));
                setSelectedDatasets([]);
            })
            .catch(() => {
                showSnackbar("Error downloading datasets", "error");
            });
    };

    return (
        <Box>
            <Typography level="h2" mb={2} sx={{ textAlign: "start" }}>
                Download Datasets
            </Typography>

            <Stack spacing={2} sx={{ marginY: 1 }} level="body1">
                <Typography>
                    Please download all the original datasets provided. The datasets contain sensitive
                    information, and your goal is to apply a data privatization method of your choice to ensure the
                    privacy and security of the data.
                </Typography>
                <Typography>
                    Once the privatization process is complete, save the resulting privatized datasets. You will
                    need to upload them in the final step of this workflow.
                </Typography>
            </Stack>

            <Typography sx={{ marginY: 1, p: 1 }} variant="soft" color="neutral" level="body1">
                <Typography sx={{ fontWeight: 'bold' }}>
                    Important: Replace the textual data column with the privatized data while keeping all other columns unchanged and in their original order. This ensures that the benchmarking process functions correctly and handles the datasets as intended.
                </Typography>
            </Typography>

            <DatasetsTable
                datasets={datasets}
                selectedDatasets={selectedDatasets}
                downloadedDatasets={downloadedDatasets}
                handleToggleSelect={handleToggleSelect}
                handleSelectAll={handleSelectAll}
            />

            <Typography sx={{ p: 1 }} startDecorator={<InfoOutlined />} variant="soft" color="neutral" level="body1">
                Please make sure you have downloaded the datasets before proceeding to the next step!
            </Typography>

            <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                    fullWidth
                    variant="solid"
                    startDecorator={<CloudDownload />}
                    onClick={handleDownloadSelected}
                    disabled={selectedDatasets.length === 0}
                >
                    Download Selected Datasets
                </Button>
            </Box>
        </Box>
    );
};

export default DownloadStep;
