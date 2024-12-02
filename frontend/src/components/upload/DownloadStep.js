import React from "react";
import { Box, Button, Card, Typography } from "@mui/joy";
import { CloudDownload } from "@mui/icons-material";

const DownloadStep = ({ onDatasetDownload }) => {
    // Function to trigger dataset loading and file download
    const handleDownload = async () => {
        try {
            // Fetch the ZIP file containing all datasets from the `/datasets` endpoint
            const response = await fetch("http://localhost:5000/datasets", {
                credentials: "include",
            });
    
            // Check if the request was successful
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to load dataset:", errorData.error);
                return;
            }
            onDatasetDownload("Datasets downloaded");
    
            // Convert the response to a Blob
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
    
            // Create a temporary link to download the file
            const link = document.createElement("a");
            link.href = url;
            link.download = "datasets.zip"; // Name for the downloaded ZIP file
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
    
            // Revoke the object URL to free memory
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("An error occurred:", error);
        }
    };
    

    return (
        <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Download dataset
            </Typography>
            <Box sx={{ textAlign: "center", mb: 2 }}>
                <Typography level="body1">
                    In this step, you need to download the original dataset provided. The dataset contains sensitive
                    information, and your goal is to apply a data privatization method of your choice to ensure the privacy
                    and security of the dataset.
                </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mb: 2 }}>
                <Typography level="body1">
                    You can use any suitable technique, such as data masking, encryption, anonymization, or synthetic data
                    generation. The objective is to protect sensitive information while retaining the dataset's utility for
                    analysis.
                </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mb: 2 }}>
                <Typography level="body1">
                    Once the privatization process is complete, save the resulting privatized dataset. You will need to
                    upload it in the final step of this workflow. Ensure that the privatized dataset aligns with the
                    required format and adheres to the constraints specified for upload compatibility.
                </Typography>
            </Box>

            <Box sx={{ textAlign: "center", mb: 2 }}>
                <Typography level="body1" sx={{ fontWeight: "bold" }}>
                    Please make sure you have downloaded the dataset before going to the next step!
                </Typography>
            </Box>

            <Button
                variant="soft"
                size="lg"
                startDecorator={<CloudDownload />}
                sx={{ mt: 2 }}
                onClick={handleDownload} // Attach the function here
            >
                Download
            </Button>
        </Card>
    );
};

export default DownloadStep;
