import React from "react";
import {
    Button,
    Card,
    FormControl,
    Input,
    Textarea,
    Typography,
    Select,
    Option,
    Checkbox, Box,
} from "@mui/joy";
import { Save } from "@mui/icons-material";

const MetadataCard = ({ metadata, setMetadata, licenseOptions, handleSave, shouldDownload, setShouldDownload }) => {
    const handleChange = (field, value) => {
        setMetadata((prevState) => ({
            ...prevState,
            [field]: value,
        }));
    };

    return (
        <Card variant="outlined" sx={{ width: 1000, padding: 4 }}>
            <Typography level="h2" mb={2} sx={{ textAlign: "center" }}>
                Model Metadata
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
                            sx={{ width: "100%", bgcolor: "grey.200" }}
                        />
                    </Box>

                    <Box>
                        <Typography level="body1" sx={{ marginBottom: 1 }}>
                            License
                        </Typography>
                        <Select
                            placeholder="Select a license"
                            value={metadata.license}
                            onChange={(e, value) => handleChange("license", value)}
                            sx={{ width: "100%", bgcolor: "grey.200" }}
                        >
                            {licenseOptions.map((license) => (
                                <Option key={license} value={license}>
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
                            sx={{ width: "100%", bgcolor: "grey.200" }}
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
                            sx={{
                                bgcolor: "grey.200",
                                height: 150,
                                maxHeight: 150,
                                overflow: "auto",
                            }}
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
                            sx={{
                                bgcolor: "grey.200",
                                height: 150,
                                maxHeight: 150,
                                overflow: "auto",
                            }}
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
                            sx={{ width: "100%", bgcolor: "grey.200" }}
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
                            sx={{ width: "100%", bgcolor: "grey.200" }}
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
                            sx={{ width: "100%", bgcolor: "grey.200" }}
                        />
                    </Box>
                </Box>

                <Checkbox
                    checked={shouldDownload}
                    onChange={(e) => setShouldDownload(e.target.checked)}
                    label="Download model card as markdown"
                    sx={{ mt: 1 }}
                />
                <Button
                    variant="solid"
                    size="lg"
                    color="primary"
                    onClick={handleSave}
                    sx={{ mt: 2 }}
                    startDecorator={<Save />}
                >
                    Save Metadata
                </Button>
            </FormControl>
        </Card>

    );
};

export default MetadataCard;
