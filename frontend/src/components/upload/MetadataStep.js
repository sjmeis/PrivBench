import React, { useState } from "react";
import { Button, Card, FormControl, Input, Textarea, Typography, Select, Option } from "@mui/joy";
import { AddCircle, Save } from "@mui/icons-material";
import axios from "axios"; 

const MetadataStep = () => {
    const [metadata, setMetadata] = useState({
        modelName: "",
        modelDescription: "",
        license: "",
        libraryName: "",
        parentModel: "",
        datasets: "",
        metrics: "",
        tags: "",
        authors: "",
        relatedResearchPaper: "",
        relatedGithubRepo: "",
        bibtexCitation: "",
    });

    // Mock data for dropdowns
    const licenseOptions = ["MIT", "Apache 2.0", "GPLv3", "BSD"];
    const libraryOptions = ["TensorFlow", "PyTorch", "Keras", "Hugging Face"];
    const metricOptions = ["Accuracy", "Precision", "Recall", "F1-Score"];

    // Handle input changes
    const handleChange = (field, value) => {
        setMetadata((prevState) => ({
            ...prevState,
            [field]: value,
        }));
    };

    const handleSave = async () => {
        try {
            // Construct the API endpoint
            const endpoint = "http://localhost:5000/metadata"; 
    
            // Send a POST request with metadata
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: 'include',
                body: JSON.stringify(metadata),
            });
    
            // Check if the request was successful
            if (response.ok) {
                alert("Metadata saved successfully!");
            } else {
                const errorData = await response.json();
                alert(`Failed to save metadata: ${errorData.message || response.statusText}`);
            }
        } catch (error) {
            console.error("Error saving metadata:", error);
            alert("Failed to save metadata. Please try again.");
        }
    };
    
    // Generate Markdown content
    // Generate Markdown content
    const generateMarkdown = () => {
        return `
---
---

# Model Card for ${metadata.modelName || "Unnamed Model"}

<!-- Provide a quick summary of what the model is/does. [Optional] -->
${metadata.modelDescription || "Some cool model..."}

# Table of Contents
- [Model Details](#model-details)
- [Uses](#uses)
- [Bias, Risks, and Limitations](#bias-risks-and-limitations)
- [Training Details](#training-details)
- [Evaluation](#evaluation)
- [Model Examination](#model-examination)
- [Environmental Impact](#environmental-impact)
- [Technical Specifications](#technical-specifications)
- [Citation](#citation)
- [Glossary](#glossary)
- [More Information](#more-information)
- [Model Card Authors](#model-card-authors)
- [Model Card Contact](#model-card-contact)

## Model Details

### License
${metadata.license || "Unknown"}

### Library Name
${metadata.libraryName || "Unknown"}

### Parent Model
${metadata.parentModel || "More information needed"}

### Datasets
${metadata.datasets || "More information needed"}

### Metrics
${metadata.metrics || "More information needed"}

### Tags
${metadata.tags || "None"}

### Authors
${metadata.authors || "None"}

### Related Research Paper
${metadata.relatedResearchPaper || "None"}

### Related GitHub Repository
${metadata.relatedGithubRepo || "None"}

## Citation

### BibTeX
${metadata.bibtexCitation || "More information needed"}

`;
    };

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
                <Typography level="h5" sx={{ marginTop: 2 }}>Model Name</Typography>
                <Input
                    placeholder="Enter the model name"
                    value={metadata.modelName}
                    onChange={(e) => handleChange("modelName", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Model Description</Typography>
                <Textarea
                    placeholder="Provide a detailed description of the model"
                    value={metadata.modelDescription}
                    onChange={(e) => handleChange("modelDescription", e.target.value)}
                    minRows={4}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>License</Typography>
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

                <Typography level="h5" sx={{ marginTop: 2 }}>Library Name</Typography>
                <Select
                    placeholder="Select a library"
                    value={metadata.libraryName}
                    onChange={(e, value) => handleChange("libraryName", value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                >
                    {libraryOptions.map((library) => (
                        <Option key={library} value={library}>
                            {library}
                        </Option>
                    ))}
                </Select>

                <Typography level="h5" sx={{ marginTop: 2 }}>Parent Model (URL)</Typography>
                <Input
                    placeholder="Provide the parent model's URL"
                    value={metadata.parentModel}
                    onChange={(e) => handleChange("parentModel", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Datasets</Typography>
                <Input
                    placeholder="Enter datasets (comma-separated)"
                    value={metadata.datasets}
                    onChange={(e) => handleChange("datasets", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Metrics</Typography>
                <Select
                    placeholder="Select a metric"
                    value={metadata.metrics}
                    onChange={(e, value) => handleChange("metrics", value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                >
                    {metricOptions.map((metric) => (
                        <Option key={metric} value={metric}>
                            {metric}
                        </Option>
                    ))}
                </Select>

                <Typography level="h5" sx={{ marginTop: 2 }}>Tags</Typography>
                <Input
                    placeholder="Enter tags (comma-separated)"
                    value={metadata.tags}
                    onChange={(e) => handleChange("tags", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Author(s)</Typography>
                <Input
                    placeholder="Enter authors (comma-separated)"
                    value={metadata.authors}
                    onChange={(e) => handleChange("authors", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Related Research Paper</Typography>
                <Input
                    placeholder="Provide the URL to the research paper"
                    value={metadata.relatedResearchPaper}
                    onChange={(e) => handleChange("relatedResearchPaper", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Related GitHub Repository</Typography>
                <Input
                    placeholder="Provide the URL to the GitHub repository"
                    value={metadata.relatedGithubRepo}
                    onChange={(e) => handleChange("relatedGithubRepo", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

                <Typography level="h5" sx={{ marginTop: 2 }}>Bibtex Citation</Typography>
                <Input
                    placeholder="Provide the Bibtex citation"
                    value={metadata.bibtexCitation}
                    onChange={(e) => handleChange("bibtexCitation", e.target.value)}
                    sx={{ marginBottom: 2, bgcolor: "grey.200" }}
                />

            <Button
                variant="soft"
                size="lg"
                onClick={handleDownload}
                sx={{ mt: 2 }}
                startDecorator={<AddCircle />}
            >
                Create Model Card Markdown
            </Button>
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

