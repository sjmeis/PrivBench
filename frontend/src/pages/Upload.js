import React, { useState, useEffect } from "react";
import { Box, Button } from "@mui/joy";
import { Done, East, West } from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarProvider";
import DownloadStep from "../components/submission/DownloadStep";
import MetadataStep from "../components/submission/MetadataStep";
import UploadStep from "../components/submission/UploadStep";
import FinalStep from "../components/submission/FinalStep";
import { getUserSubmissions } from "../services/RankingsService";
import { SideNaveSubmission } from "../components/submission/SideNaveSubmission";

const Upload = () => {
    const location = useLocation();
    const { state } = location;

    const [currentStep, setCurrentStep] = useState(state?.currentStep || 0);
    const [submissionId, setSubmissionId] = useState(state?.submissionId || null);
    const [downloadedDatasets, setDownloadedDatasets] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({});
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
    const [isMetadataValid, setIsMetadataValid] = useState(false);
    const { showSnackbar } = useSnackbar();

    const fetchUserSubmission = async () => {
        try {
            const data = await getUserSubmissions();
            const pendingSubmission = data.submissions.find(
                (sub) => sub.status === "pending"
            );

            if (pendingSubmission) {
                setCurrentStep(2);
                setMetadata(pendingSubmission.metadata);
                setSubmissionId(pendingSubmission.id);
            } else {
                setMetadata({});
            }
        } catch (error) {
            console.error("An error occurred while fetching user submission:", error);
        }
    };

    useEffect(() => {
        fetchUserSubmission();
    }, []);

    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const listResponse = await fetch("http://localhost:5000/datasets/list", {
                    credentials: "include",
                    cache: "no-cache",
                });
                if (!listResponse.ok) {
                    const errorData = await listResponse.json();
                    console.error("Failed to fetch datasets:", errorData.error);
                    return;
                }

                const data = await listResponse.json();

                const datasetsWithDetails = await Promise.all(
                    data.datasets.map(async (dataset) => {
                        try {
                            const contentResponse = await fetch(
                                `http://localhost:5000/datasets/${encodeURIComponent(dataset.name)}`,
                                {
                                    credentials: "include",
                                    cache: "no-cache",
                                }
                            );

                            if (!contentResponse.ok) {
                                console.error(`Failed to fetch content for dataset ${dataset.name}`);
                                return { ...dataset, rows: 0, columns: 0 };
                            }

                            const content = await contentResponse.text();
                            const rows = content.trim().split("\n"); // Split by newline
                            const columns = rows[0]?.split(",").length || 0; // Use the first row for column count

                            return {
                                ...dataset,
                                rows: rows.length, // Exclude header row
                                columns,
                            };
                        } catch (error) {
                            console.error(`Error fetching dataset ${dataset.name}:`, error);
                            return { ...dataset, rows: 0, columns: 0 };
                        }
                    })
                );

                setDatasets(datasetsWithDetails);
            } catch (error) {
                console.error("An error occurred while fetching datasets:", error);
            }
        };

        fetchDatasets();
    }, []);

    const handleStepClick = (step) => {
        setCurrentStep(step);
    };

    const validateMetadata = () => {
        const requiredFields = [
            "modelName",
            "modelDescription",
            "license",
            "authors",
            "researchPaperUrl",
            "githubUrl",
            "bibtexCitation",
        ];
        return requiredFields.every((field) => metadata[field] && metadata[field].trim().length > 0);
    };

    useEffect(() => {
        if (currentStep === 1) {
            setIsMetadataValid(validateMetadata());
        }
        // eslint-disable-next-line
    }, [metadata, currentStep]);

    const handleSaveMetadata = async () => {
        try {
            const isUpdate = Boolean(submissionId);
            const endpoint = "http://localhost:5000/metadata";
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
                    isUpdate ? "Metadata updated successfully!" : "Metadata saved successfully!",
                    "success"
                );

                if (!isUpdate && data.submission_id) {
                    setSubmissionId(data.submission_id);
                }

                // Advance to the next step
                setCurrentStep((prev) => prev + 1);
            } else {
                const errorData = await response.json().catch(() => ({}));
                showSnackbar(
                    `Failed to ${
                        isUpdate ? "update" : "save"
                    } metadata: ${errorData.message || response.statusText || "Unknown error"}`,
                    "error"
                );
            }
        } catch (error) {
            console.error("Error saving/updating metadata:", error);
            showSnackbar("Failed to save metadata. Please try again!", "error");
        }
    };

    const handleNext = () => {
        if (currentStep === 1) {
            if (!isMetadataValid) {
                showSnackbar("Please fill in all metadata fields!", "error");
                return;
            }
            handleSaveMetadata();
            return;
        }
        setCurrentStep((prev) => prev + 1);
    };

    return (
        <Box
            sx={{
                display: "flex",
                minHeight: "calc(100vh - 65.5px)",
                bgcolor: "background.body",
                marginTop: "-10px",
                marginBottom: "-40px",
                marginLeft: "-40px",
                marginRight: "-40px",
            }}
        >
            <SideNaveSubmission currentStep={currentStep} handleStepClick={handleStepClick} />

            <Box sx={{ flex: 1, p: 3 }}>
                {currentStep !== 3 && (
                    <Box
                        sx={{
                            position: "fixed",
                            bottom: 0,
                            left: 0,
                            marginLeft: "260px",
                            width: "calc(100vw - 260px )",
                            p: 3,
                            display: "flex",
                            justifyContent: "flex-end",
                            gap: 2,
                        }}
                    >
                        <Button
                            sx={{ width: "133px" }}
                            variant="soft"
                            color="neutral"
                            onClick={() => setCurrentStep((prev) => prev - 1)}
                            startDecorator={<West />}
                            disabled={currentStep === 0}
                            size="lg"
                        >
                            Back
                        </Button>

                        <Button
                            sx={{ width: "133px" }}
                            variant="solid"
                            color={currentStep === 2 ? "success" : "primary"}
                            onClick={handleNext}
                            endDecorator={currentStep === 2 ? <Done /> : <East />}
                            size="lg"
                            disabled={(currentStep === 1 && !isMetadataValid) || (currentStep === 2 && !datasets.every(dataset => uploadedFiles[dataset.id]))}
                        >
                            {currentStep === 2 ? "Submit" : "Next"}
                        </Button>
                    </Box>
                )}

                <Box
                    flex={1}
                    width="100%"
                    padding={2}
                    sx={{
                        maxHeight: "calc(100vh - 80px)",
                    }}
                >
                    {currentStep === 0 && (
                        <DownloadStep
                            onDatasetDownloaded={(datasetName) => {
                                setDownloadedDatasets((prev) => [...prev, datasetName]);
                            }}
                            onDatasetsFetched={(fetchedDatasets) => {
                                setDatasets(fetchedDatasets);
                            }}
                            downloadedDatasets={downloadedDatasets}
                        />
                    )}

                    {currentStep === 1 && (
                        <MetadataStep
                            metadata={metadata} setMetadata={setMetadata}
                        />
                    )}

                    {currentStep === 2 && (
                        <UploadStep
                            submissionId={submissionId}
                            datasets={datasets}
                            uploadedFiles={uploadedFiles}
                            onFileUploaded={(datasetId, fileName) => {
                                setUploadedFiles((prev) => ({
                                    ...prev,
                                    [datasetId]: fileName,
                                }));
                            }}
                        />
                    )}

                    {currentStep === 3 && <FinalStep />}
                </Box>
            </Box>
        </Box>
    );
};

export default Upload;
