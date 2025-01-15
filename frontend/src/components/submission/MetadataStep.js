import React, { useState, useEffect } from "react";
import MetadataCard from "./MetadataCard";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const MetadataStep = ({ initialMetadata, submissionId, onMetadataSave }) => {
    const [metadata, setMetadata] = useState({
        modelName: "",
        modelDescription: "",
        license: "",
        tags: [],
        authors: "",
        researchPaperUrl: "",
        githubUrl: "",
        bibtexCitation: "",
    });

    const [shouldDownload, setShouldDownload] = useState(false);
    const { showSnackbar } = useSnackbar();

    const licenseOptions = ["MIT", "Apache 2.0", "GPLv3", "BSD"];

    // Initialize metadata if provided
    useEffect(() => {
        if (initialMetadata) {
            setMetadata(initialMetadata);
        }
    }, [initialMetadata]);

    // Handle saving metadata
    const handleSave = async () => {
        try {
            if (shouldDownload) {
                handleDownload();
            }

            const isUpdate = !!submissionId;
            const endpoint = `http://localhost:5000/metadata`;
            const method = isUpdate ? "PUT" : "POST";

            const body = isUpdate
                ? JSON.stringify({
                    id: submissionId,
                    metadata,
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
                    onMetadataSave(data.submission_id, true);
                } else {
                    onMetadataSave(data.submission.id, true);
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
            showSnackbar("Failed to save metadata. Please try again!", "error");
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
        <MetadataCard
            metadata={metadata}
            setMetadata={setMetadata}
            licenseOptions={licenseOptions}
            handleSave={handleSave}
            shouldDownload={shouldDownload}
            setShouldDownload={setShouldDownload}
        />
    );
};

export default MetadataStep;
