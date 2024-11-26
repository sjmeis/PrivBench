import React from "react";
import { Box, Button, Card, IconButton, Typography } from "@mui/joy";
import { CloudUpload, Delete } from "@mui/icons-material";

const UploadStep = ({ storedFiles, handleFileChange, handleDeleteFile }) => {
    return (
        <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Upload the privatized datasets
            </Typography>

            <Typography level="h4" mb={4}>
                In this step, you need to upload the privatized datasets. Please follow these instructions carefully:
            </Typography>

            <Typography level="body2" mb={2}>
                1. Click the <strong>Upload</strong> button to select and upload a <code>.csv</code> file corresponding to each of the datasets you previously downloaded and privatized. Ensure that the files are in the correct format and contain the expected data structure.
            </Typography>

            <Typography level="body2" mb={2}>
                2. After selecting the file, verify that it meets the required specifications and is ready for submission.
            </Typography>

            <Typography level="body2" mb={2}>
                3. Once the upload is complete, click the <strong>Submit</strong> button to finalize your submission. Your submission will then be evaluated based on the uploaded file.
            </Typography>

            <Typography level="h4" mb={2}>
                Make sure all the necessary steps are completed before submitting, as the evaluation will be based on the file you upload.
            </Typography>


            {storedFiles.map((file, index) => (
                <Box key={index} display="flex" alignItems="center" mt={1}>
                    <Typography variant="body2" color="text.primary" sx={{ flexGrow: 1 }}>
                        {file.name}
                    </Typography>
                    <IconButton
                        size="small"
                        onClick={() => handleDeleteFile(file.name)}
                    >
                        <Delete fontSize="md" />
                    </IconButton>
                </Box>
            ))}

            {/* File selection button */}
            <Button
                component="label"
                size="lg"
                tabIndex={-1}
                variant="soft"
                startDecorator={<CloudUpload />}
                sx={{ mt: 2 }}
            >
                Upload files
                <input
                    type="file"
                    multiple
                    accept=".csv"
                    onChange={handleFileChange}
                    style={{ display: "none" }}
                />
            </Button>
        </Card>
    );
};

export default UploadStep;
