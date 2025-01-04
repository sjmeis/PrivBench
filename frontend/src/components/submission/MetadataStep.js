import React, { useState, useEffect } from "react";
import {
    Button,
    Card,
    FormControl,
    Input,
    Textarea,
    Typography,
    Select,
    Option,
    Checkbox,
} from "@mui/joy";
import { Save } from "@mui/icons-material";
import { useSnackbar } from "../../contexts/SnackbarProvider"; // Adjust the import path

const MetadataStep = ({ initialMetadata, submissionId, onMetadataSave }) => {
    const [metadata, setMetadata] = useState({
        modelName: "",
        modelDescription: "",
        license: "",
        tags: "",
        authors: "",
        researchPaperUrl: "",
        githubUrl: "",
        bibtexCitation: "",
    });

    const [shouldDownload, setShouldDownload] = useState(false);
    const { showSnackbar } = useSnackbar(); // Use showSnackbar

    // Mock data for dropdowns
    const licenseOptions = ["MIT", "Apache 2.0", "GPLv3", "BSD"];

    // Set initial metadata if provided
    useEffect(() => {
        if (initialMetadata) {
            setMetadata(initialMetadata);
        }
    }, [initialMetadata]);

    // Handle input changes
    const handleChange = (field, value) => {
        setMetadata((prevState) => ({
            ...prevState,
            [field]: value,
        }));
    };

    // Handle saving metadata
    const handleSave = async () => {
        try {
            if (shouldDownload) {
                handleDownload();
            }

            const isUpdate = !!submissionId; // Determine whether it's an update or create request
            const endpoint = `http://localhost:5000/metadata`;

            const method = isUpdate ? "PUT" : "POST";

            const body = isUpdate
                ? JSON.stringify({
                    id: submissionId,
                    metadata: {
                        modelName: metadata.modelName,
                        modelDescription: metadata.modelDescription,
                        license: metadata.license,
                        tags: metadata.tags,
                        authors: metadata.authors,
                        researchPaperUrl: metadata.researchPaperUrl,
                        githubUrl: metadata.githubUrl,
                        bibtexCitation: metadata.bibtexCitation,
                    },
                })
                : JSON.stringify(metadata);

            const response = await fetch(endpoint, {
                method,
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
                body,
            });

            if (response.ok) {
                const data = await response.json();
                showSnackbar(
                    isUpdate
                        ? "Metadata updated successfully!"
                        : "Metadata saved successfully!",
                    "success"
                );
                if (!isUpdate) {
                    onMetadataSave(data.submission_id); // Handle new submission ID after POST
                } else {
                    onMetadataSave(data.submission.id); // Handle updated submission ID after PUT
                }
            } else {
                const errorData = await response.json();
                showSnackbar(
                    `Failed to ${
                        isUpdate ? "update" : "save"
                    } metadata: ${errorData.message || response.statusText}`,
                    "error"
                );
            }
        } catch (error) {
            console.error("Error saving/updating metadata:", error);
            showSnackbar(
                "Failed to save metadata. Please try again!",
                "error"
            );
        }
    };

    // Generate Markdown content
    const generateMarkdown = () => `
---
---

# Model Card for ${metadata.modelName || "Unnamed Model"}

${metadata.modelDescription || "Some cool model..."}

## Model Details
### License
${metadata.license || "Unknown"}

### Tags
${metadata.tags || "None"}

### Authors
${metadata.authors || "None"}

### Related Research Paper
${metadata.researchPaperUrl || "None"}

### Related GitHub Repository
${metadata.githubUrl || "None"}

## Citation
### BibTeX
${metadata.bibtexCitation || "More information needed"}
`;

    // Download Markdown file
    const handleDownload = () => {
        const markdownContent = generateMarkdown();
        const blob = new Blob([markdownContent], { type: "text/markdown" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${metadata.modelName || "Model_Card"}.md`;
        link.click();
    };

    return (
        <Card variant="outlined" sx={{ width: 800, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Model Metadata
            </Typography>

            <FormControl>
                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Model Name
                </Typography>
                <Input
                    placeholder="Enter the model name"
                    value={metadata.modelName}
                    onChange={(e) => handleChange("modelName", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Model Description
                </Typography>
                <Textarea
                    placeholder="Provide a detailed description of the model"
                    value={metadata.modelDescription}
                    onChange={(e) => handleChange("modelDescription", e.target.value)}
                    minRows={4}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    License
                </Typography>
                <Select
                    placeholder="Select a license"
                    value={metadata.license}
                    onChange={(e, value) => handleChange("license", value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                >
                    {licenseOptions.map((license) => (
                        <Option key={license} value={license}>
                            {license}
                        </Option>
                    ))}
                </Select>

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Tags
                </Typography>
                <Input
                    placeholder="Enter tags (comma-separated)"
                    value={metadata.tags}
                    onChange={(e) => handleChange("tags", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Author(s)
                </Typography>
                <Input
                    placeholder="Enter authors (comma-separated)"
                    value={metadata.authors}
                    onChange={(e) => handleChange("authors", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Related Research Paper
                </Typography>
                <Input
                    placeholder="Provide the URL to the research paper"
                    value={metadata.researchPaperUrl}
                    onChange={(e) => handleChange("researchPaperUrl", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Related GitHub Repository
                </Typography>
                <Input
                    placeholder="Provide the URL to the GitHub repository"
                    value={metadata.githubUrl}
                    onChange={(e) => handleChange("githubUrl", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>
                    Bibtex Citation
                </Typography>
                <Textarea
                    placeholder="Provide the Bibtex citation"
                    value={metadata.bibtexCitation}
                    onChange={(e) => handleChange("bibtexCitation", e.target.value)}
                    minRows={4}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Checkbox
                    checked={shouldDownload}
                    onChange={(e) => setShouldDownload(e.target.checked)}
                    label="Download model card as markdown"
                    sx={{ mt: 2 }}
                />
                <Button
                    variant="solid"
                    size="lg"
                    color="primary"
                    onClick={handleSave}
                    sx={{ mt: 2 }}
                    startDecorator={<Save />}
                >
                    Save Model Data
                </Button>
            </FormControl>
        </Card>
    );
};

export default MetadataStep;
