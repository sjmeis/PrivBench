import React, {useState, useEffect} from "react";
import {Box, Button, Stack, Typography} from "@mui/joy";
import {CloudDownload, InfoOutlined} from "@mui/icons-material";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import DatasetsTable from "./DatasetTable";

const DownloadStep = ({onDatasetDownloaded, onDatasetsFetched, downloadedDatasets}) => {
    const [datasets, setDatasets] = useState([]);
    const [selectedDatasets, setSelectedDatasets] = useState([]);
    const {showSnackbar} = useSnackbar();

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
        <Box>
            <Typography level="h2" mb={2} sx={{textAlign: "start"}}>
                Download Datasets
            </Typography>
            <Typography sx={{marginY: 1, p: 1}} variant='soft'
                        color='neutral' level="body1">
                <Stack spacing={2}>
                    <Typography>
                        Please download all the original datasets provided. The datasets contain sensitive
                        information, and your goal is to apply a data privatization method of your choice to ensure the
                        privacy
                        and security of the data.
                    </Typography>

                    <Typography>
                        Once the privatization process is complete, save the resulting privatized datasets. You will
                        need to
                        upload them in the final step of this workflow. Ensure that the privatized datasets align with
                        the
                        required format and adhere to the constraints specified for upload compatibility.
                    </Typography>
                </Stack>
            </Typography>





            <DatasetsTable
                datasets={datasets}
                downloadedDatasets={downloadedDatasets}
                selectedDatasets={selectedDatasets}
                handleToggleSelect={handleToggleSelect}
                handleSelectAll={handleSelectAll}
            />
            <Typography sx={{p: 1}} startDecorator={<InfoOutlined/>} variant='soft'
                        color='neutral' level="body1">
                Please make sure you have downloaded the datasets before proceeding to the next step!
            </Typography>

            <Box sx={{mt: 3, textAlign: "center"}}>
                <Button
                    fullWidth
                    variant="solid"
                    startDecorator={<CloudDownload/>}
                    onClick={handleDownloadSelected}
                    disabled={selectedDatasets.length === 0}
                >
                    Download Selected Datasets
                </Button>
            </Box>
        </Box>
    )
        ;
};

export default DownloadStep;


