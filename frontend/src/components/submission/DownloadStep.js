import React, {useState, useEffect} from "react";
import {Box, Button, Stack, Typography} from "@mui/joy";
import {CloudDownload, InfoOutlined} from "@mui/icons-material";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import DatasetsTable from "./DatasetTable";
import {DatasetService} from "../../services/DatasetService";

const DownloadStep = ({onDatasetDownloaded, onDatasetsFetched}) => {
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

                // Pre-select all datasets by default
                const preselectedDatasets = data.datasets.map((dataset) => dataset.name);
                setSelectedDatasets(preselectedDatasets);

                onDatasetsFetched(data.datasets);
            } catch (error) {
                showSnackbar("Failed to fetch datasets", "error");
            }
        };
        fetchDatasets();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);


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
                .map((dataset) => dataset.name);
            setSelectedDatasets(selectableDatasets);
        } else {
            setSelectedDatasets([]);
        }
    };

    const handleDownloadSelected = () => {
        DatasetService.downloadDatasets(selectedDatasets)
            .then(() => {
                showSnackbar("All selected datasets were downloaded successfully!", "success");
            })
            .catch((error) => {

                showSnackbar("Error downloading datasets", "error");
            });
    };


    return (
        <Box>
            <Typography level="h2" mb={2} sx={{textAlign: "start"}}>
                Download Datasets
            </Typography>

            <Typography sx={{marginY: 1, }} level="body1">
                <Stack spacing={2}>
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
            </Typography>


            <Typography sx={{marginY: 1, p: 1}} variant="soft" color="neutral" level="body1">
                <Stack spacing={2}>

                    <Typography sx={{ fontWeight: 'bold' }}>
                        Important: Replace the textual data column with the privatized data while keeping all other columns unchanged and in their original order. This ensures that the benchmarking process functions correctly and handles the datasets as intended.
                    </Typography>
                </Stack>
            </Typography>


            <DatasetsTable
                datasets={datasets}
                selectedDatasets={selectedDatasets}
                handleToggleSelect={handleToggleSelect}
                handleSelectAll={handleSelectAll}
            />
            <Typography sx={{p: 1}} startDecorator={<InfoOutlined/>} variant="soft" color="neutral" level="body1">
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
    );
};

export default DownloadStep;






