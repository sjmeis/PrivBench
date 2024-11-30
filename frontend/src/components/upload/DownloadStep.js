import React from "react";
import { Box, Button, Card, Typography } from "@mui/joy";
import { CloudDownload } from "@mui/icons-material";

const DownloadStep = () => {
    // Function to trigger dataset loading and file download
    const handleDownload = async () => {
        try {
            // Create a new dataset entry by calling the backend API
            const response = await fetch("http://localhost:5000/load-dataset", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: 'include',
                body: JSON.stringify({
                    name: "priv1.csv",
                }),
            });

            // Check if the request was successful
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Failed to load dataset:", errorData.error);
                return;
            }

            console.log("Dataset entry loaded successfully");
            
            // If successful, proceed with file download
            const link = document.createElement("a");
            link.href = "/priv1.csv"; // File location
            link.download = "priv1.csv";
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

        } catch (error) {
            console.error("An error occurred while loading the dataset:", error);
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
