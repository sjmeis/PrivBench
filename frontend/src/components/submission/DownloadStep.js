import React, { useState, useEffect } from "react";
import { Box, Button, Card, Typography } from "@mui/joy";
import { CloudDownload } from "@mui/icons-material";
import CustomSnackbar from "../shared/CustomSnackbar";  // Import CustomSnackbar

const DownloadStep = ({ onDatasetDownloaded, onDatasetsFetched, downloadedDatasets }) => {
  const [datasets, setDatasets] = useState([]);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");

  useEffect(() => {
    const fetchDatasets = async () => {
      try {
        const response = await fetch("http://localhost:5000/datasets/list", {
          credentials: 'include',
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
        console.error("An error occurred:", error);
      }
    };
    fetchDatasets();
  }, []);

  const handleDownloadDataset = async (datasetName) => {
    try {
      console.log("Downloading dataset:", datasetName);
      const response = await fetch(`http://localhost:5000/datasets/${encodeURIComponent(datasetName)}`, {
        credentials: 'include',
        cache: 'no-cache', // Prevent caching issues
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Failed to load dataset:", errorData.error);
        setSnackbarMessage(`Failed to download ${datasetName}`);
        setSnackbarSeverity("error");
        setOpenSnackbar(true);
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

      // Inform parent that dataset has been downloaded
      onDatasetDownloaded(datasetName);

      // Show success snackbar
      setSnackbarMessage(`${datasetName} downloaded successfully`);
      setSnackbarSeverity("success");
      setOpenSnackbar(true);
    } catch (error) {
      console.error("An error occurred:", error);
      setSnackbarMessage(`Error downloading ${datasetName}`);
      setSnackbarSeverity("error");
      setOpenSnackbar(true);
    }
  };

  return (
      <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
        <Typography level="h4" mb={2} sx={{ textAlign: "center" }}>
          Download Datasets
        </Typography>
        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography level="body1">
            In this step, you need to download the original datasets provided. The datasets contain sensitive
            information, and your goal is to apply a data privatization method of your choice to ensure the privacy
            and security of the data.
          </Typography>
        </Box>

        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography level="body1">
            You can use any suitable technique, such as data masking, encryption, anonymization, or synthetic data
            generation. The objective is to protect sensitive information while retaining the datasets' utility for
            analysis.
          </Typography>
        </Box>

        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography level="body1">
            Once the privatization process is complete, save the resulting privatized datasets. You will need to
            upload them in the final step of this workflow. Ensure that the privatized datasets align with the
            required format and adhere to the constraints specified for upload compatibility.
          </Typography>
        </Box>

        <Box sx={{ textAlign: "center", mb: 2 }}>
          <Typography level="body1" sx={{ fontWeight: "bold" }}>
            Please make sure you have downloaded the datasets!
          </Typography>
        </Box>

        {datasets.map((dataset) => (
            <Box key={dataset.name} sx={{ textAlign: "center", mb: 2 }}>
              <Typography level="body1">
                Dataset: {dataset.name}
              </Typography>
              <Button
                  variant="soft"
                  size="lg"
                  startDecorator={<CloudDownload />}
                  sx={{ mt: 2 }}
                  onClick={() => handleDownloadDataset(dataset.name)}
                  disabled={downloadedDatasets.includes(dataset.name)} // Disable if already downloaded
              >
                {downloadedDatasets.includes(dataset.name) ? "Downloaded" : `Download ${dataset.name}`}
              </Button>
            </Box>
        ))}

        {/* Snackbar for error or success message */}
        <CustomSnackbar
            open={openSnackbar}
            message={snackbarMessage}
            severity={snackbarSeverity}
            onClose={() => setOpenSnackbar(false)}
        />
      </Card>
  );
};

export default DownloadStep;
