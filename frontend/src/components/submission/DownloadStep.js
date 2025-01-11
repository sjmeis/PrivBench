import React, { useState, useEffect } from "react";
import { Box, Button, Card, Typography } from "@mui/joy";
import { CloudDownload } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import DatasetsTable from "./DatasetTable";

const DownloadStep = ({ onDatasetDownloaded, onDatasetsFetched, downloadedDatasets }) => {
    const [datasets, setDatasets] = useState([]);
    const [selectedDatasets, setSelectedDatasets] = useState([]);
    const { showSnackbar } = useSnackbar();

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const response = await fetch("http://localhost:5000/datasets/list", {
                    credentials: "include",
                });
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Failed to fetch datasets:", errorData.error);
                    return;
                }
                const data = await response.json();
                setDatasets(data.datasets);
                onDatasetsFetched(data.datasets);
            } catch (error) {
                showSnackbar("Failed to fetch datasets", "error");
            }
        };
        fetchDatasets();
    }, []);

    const handleDownloadDataset = async (datasetName) => {
        try {
            const response = await fetch(
                `http://localhost:5000/datasets/${encodeURIComponent(datasetName)}`,
                {
                    credentials: "include",
                    cache: "no-cache",
                }
            );
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to load dataset:", errorData.error);
                showSnackbar(`Failed to download ${datasetName}`, "error");
                return;
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = url;
            link.download = decodeURIComponent(datasetName);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            window.URL.revokeObjectURL(url);

            onDatasetDownloaded(datasetName);
            showSnackbar(`Selected datasets were downloaded successfully!`, "success");
        } catch (error) {
            console.error("An error occurred:", error);
            showSnackbar(`Error downloading datasets`, "error");
        }
    };

    const handleToggleSelect = (datasetName) => {
        setSelectedDatasets((prevSelected) =>
            prevSelected.includes(datasetName)
                ? prevSelected.filter((name) => name !== datasetName)
                : [...prevSelected, datasetName]
        );
    };

    const handleSelectAll = (checked) => {
        if (checked) {
            const selectableDatasets = datasets
                .filter((dataset) => !downloadedDatasets.includes(dataset.name))
                .map((dataset) => dataset.name);
            setSelectedDatasets(selectableDatasets);
        } else {
            setSelectedDatasets([]);
        }
    };

    const handleDownloadSelected = async () => {
        for (const datasetName of selectedDatasets) {
            if (!downloadedDatasets.includes(datasetName)) {
                await handleDownloadDataset(datasetName);
            }
        }
        setSelectedDatasets([]);
    };

    return (
        <Card variant="outlined" sx={{ width: 1000, padding: 4 }}>
            <Typography level="h2" mb={1} sx={{ textAlign: "center" }}>
                Download Datasets
            </Typography>
            <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography level="body1">
                    In this step, you need to download the original datasets provided. The datasets contain sensitive
                    information, and your goal is to apply a data privatization method of your choice to ensure the privacy
                    and security of the data.
                </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography level="body1">
                    Once the privatization process is complete, save the resulting privatized datasets. You will need to
                    upload them in the final step of this workflow. Ensure that the privatized datasets align with the
                    required format and adhere to the constraints specified for upload compatibility.
                </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography level="body1" sx={{ fontWeight: "bold" }}>
                    Please make sure you have downloaded the datasets before proceeding to the next step!
                </Typography>
            </Box>

            <DatasetsTable
                datasets={datasets}
                downloadedDatasets={downloadedDatasets}
                selectedDatasets={selectedDatasets}
                handleToggleSelect={handleToggleSelect}
                handleSelectAll={handleSelectAll}
            />

            <Box sx={{ mt: 3, textAlign: "center" }}>
                <Button
                    variant="solid"
                    size="lg"
                    startDecorator={<CloudDownload />}
                    onClick={handleDownloadSelected}
                    disabled={selectedDatasets.length === 0}
                >
                    Download Selected Datasets
                </Button>
            </Box>
        </Card>
    );
};

export default DownloadStep;


