import React, { useEffect, useState } from "react";
import {
  FormControl,
  Input,
  Textarea,
  Typography,
  Select,
  Option,
  Box,
} from "@mui/joy";
import axios from "axios";

const MetadataStep = ({ metadata, setMetadata }) => {
  const [licenseOptions, setLicenseOptions] = useState([]);

  // Fetch the license options from the backend
  useEffect(() => {
    axios
      .get("http://localhost:5000/licenses")
      .then((response) => {
        setLicenseOptions(response.data.licenses);
      })
      .catch((error) => {
        console.error("Error fetching licenses:", error);
      });
  }, []);

  const handleChange = (field, value) => {
    setMetadata((prevState) => ({
      ...prevState,
      [field]: value,
    }));
  };

  return (
    <Box>
      <Typography level="h2" mb={2}>
        Privatization Method
      </Typography>
      <FormControl>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 0.4fr 1fr",
            gap: 2,
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Model Name
            </Typography>
            <Input
              placeholder="Enter the model name"
              value={metadata.modelName}
              onChange={(e) => handleChange("modelName", e.target.value)}
              sx={{ width: "100%" }}
            />
          </Box>

          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              License
            </Typography>

            <Select
              placeholder="License"
              value={metadata.license}
              onChange={(e, value) => handleChange("license", value)}
              sx={{ width: "100%" }}
            >
              {licenseOptions.map((license, index) => (
                <Option key={index} value={license}>
                  {license}
                </Option>
              ))}
            </Select>
          </Box>

          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Related Research Paper
            </Typography>
            <Input
              placeholder="Provide the URL to the research paper"
              value={metadata.researchPaperUrl}
              onChange={(e) => handleChange("researchPaperUrl", e.target.value)}
              sx={{ width: "100%" }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            alignItems: "flex-start",
            mb: 2,
          }}
        >
          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Model Description
            </Typography>
            <Textarea
              placeholder="Provide a detailed description of the model"
              value={metadata.modelDescription}
              onChange={(e) => handleChange("modelDescription", e.target.value)}
              minRows={4}
              maxRows={4}
            />
          </Box>

          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Bibtex Citation
            </Typography>
            <Textarea
              placeholder="Provide the Bibtex citation"
              value={metadata.bibtexCitation}
              onChange={(e) => handleChange("bibtexCitation", e.target.value)}
              minRows={4}
              maxRows={4}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 2,
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Tags
            </Typography>
            <Input
              placeholder="Enter tags (comma-separated)"
              value={metadata.tags}
              onChange={(e) => handleChange("tags", e.target.value)}
              sx={{ width: "100%" }}
            />
          </Box>
        </Box>

        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 2,
            alignItems: "center",
            mb: 2,
          }}
        >
          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Author(s)
            </Typography>
            <Input
              placeholder="Enter authors (comma-separated)"
              value={metadata.authors}
              onChange={(e) => handleChange("authors", e.target.value)}
              sx={{ width: "100%" }}
            />
          </Box>

          <Box>
            <Typography level="body1" sx={{ marginBottom: 1 }}>
              Related GitHub Repository
            </Typography>
            <Input
              placeholder="Provide the URL to the GitHub repository"
              value={metadata.githubUrl}
              onChange={(e) => handleChange("githubUrl", e.target.value)}
              sx={{ width: "100%" }}
            />
          </Box>
        </Box>
      </FormControl>
    </Box>
  );
};

export default MetadataStep;
