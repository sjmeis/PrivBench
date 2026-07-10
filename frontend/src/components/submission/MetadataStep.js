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

import { useEffect, useState } from "react";
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
import MetadataTemplateSelector from "./MetadataTemplateSelector";
import { API_BASE_URL } from '../../config';

const MetadataStep = ({
  metadata,
  setMetadata,
  templates,
  onLoadTemplate,
  onDeleteTemplate,
  onClearTemplate,
  selectedTemplateId,
  disabled,
}) => {
  const [licenseOptions, setLicenseOptions] = useState([]);

  // Fetch the license options from the backend
  useEffect(() => {
    axios
      .get(`${API_BASE_URL}/licenses`)
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
      <Box display="flex" justifyContent="space-between" alignItems="center">
        <Typography level="h2" mb={2}>
          Privatization Method
        </Typography>
        {templates.length > 0 && (
          <MetadataTemplateSelector
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onLoadTemplate={onLoadTemplate}
            onDeleteTemplate={onDeleteTemplate}
            onClearTemplate={onClearTemplate}
            disabled={disabled}
          />
        )}
      </Box>
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
