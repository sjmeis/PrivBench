import React, { useState } from "react";
import { Box, Button, Card, Typography, CircularProgress } from "@mui/joy";
import { CloudUpload, Warning } from "@mui/icons-material";
import axios from "axios";

const UploadStep = ({ submissionId, datasets, uploadedFiles, onFileUploaded }) => {
  const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
  const [error, setError] = useState(null);

  const handleFileSelect = async (event, originalDatasetId) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploadingDatasetId(originalDatasetId);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('submission_id', String(submissionId));
      formData.append('original_dataset_id', String(originalDatasetId));

      await axios.post(
        `http://localhost:5000/upload-privatized-dataset`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      onFileUploaded(originalDatasetId, file.name);
    } catch (error) {
      console.error("Error uploading file:", error);
      setError(error.response?.data?.error || "Failed to upload file");
    } finally {
      setUploadingDatasetId(null);
      event.target.value = '';
    }
  };

  return (
    <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
      <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
        Upload the Privatized Datasets
      </Typography>
      {/* ... Existing instructional content ... */}

      {error && (
        <Box sx={{ 
          backgroundColor: "error.softBg", 
          p: 2, 
          borderRadius: 1,
          mb: 2,
          display: "flex",
          alignItems: "center",
          gap: 1
        }}>
          <Warning color="error" />
          <Typography color="error">{error}</Typography>
        </Box>
      )}

      {datasets.map((dataset) => (
        <Box key={dataset.id} sx={{ mt: 4 }}>
          <Typography level="h5" mb={2}>
            Upload Privatized Dataset for {dataset.name}
          </Typography>

          <Button
            component="label"
            size="lg"
            variant="soft"
            startDecorator={
              uploadingDatasetId === dataset.id ? <CircularProgress size="sm" /> : <CloudUpload />
            }
            sx={{ mt: 2 }}
            disabled={uploadingDatasetId !== null}
          >
            {uploadedFiles[dataset.id] ? "Replace File" : "Upload File"}
            <input
              type="file"
              accept=".csv"
              onChange={(e) => handleFileSelect(e, dataset.id)}
              style={{ display: "none" }}
            />
          </Button>

          {uploadedFiles[dataset.id] && (
            <Typography variant="body2" sx={{ mt: 1 }}>
              Uploaded File: {uploadedFiles[dataset.id]}
            </Typography>
          )}
        </Box>
      ))}
    </Card>
  );
};

export default UploadStep;
