import React, { useState, useEffect } from "react";
import { Box, Button } from "@mui/joy";
import {East, Publish, West} from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import { useSnackbar } from "../contexts/SnackbarProvider";
import SubmissionStepper from "../components/submission/SubmissionStepper";
import DownloadStep from "../components/submission/DownloadStep";
import MetadataStep from "../components/submission/MetadataStep";
import UploadStep from "../components/submission/UploadStep";
import FinalStep from "../components/submission/FinalStep";
import {getUserSubmissions} from '../services/RankingsService';


const Upload = () => {
    const location = useLocation();
    const { state } = location;

    const [currentStep, setCurrentStep] = useState(state?.currentStep || 0);
    const [submissionId, setSubmissionId] = useState(state?.submissionId || null);
    const [downloadedDatasets, setDownloadedDatasets] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({});
    const [metadata, setMetadata] = useState(state?.metadata || null);

    const { showSnackbar } = useSnackbar();

    const fetchUserSubmission = async () => {
        try {
            const data = await getUserSubmissions();
            const pendingSubmission = data.submissions.find(
                (sub) => sub.status === "pending"
            );

            if (pendingSubmission) {
                setCurrentStep(1);
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
        if (currentStep === 1) {
            fetchUserSubmission();
        }
    }, [currentStep]);


    useEffect(() => {
        const fetchDatasets = async () => {
            try {
                const response = await fetch("http://localhost:5000/datasets/list");
                if (!response.ok) {
                    const errorData = await response.json();
                    console.error("Failed to fetch datasets:", errorData.error);
                    return;
                }
                const data = await response.json();
                setDatasets(data.datasets);
            } catch (error) {
                console.error("An error occurred:", error);
            }
        };
        fetchDatasets();
    }, []);

    const handleStepClick = (step) => {
        setCurrentStep(step);
    };

    const handleNext = () => {
        if (currentStep === 1 && !submissionId) {
            showSnackbar("Please save metadata!", "error");
            return;
        }

        if (currentStep === 2) {
            if (datasets.length > 0 && Object.keys(uploadedFiles).length < datasets.length) {
                showSnackbar("Please upload the privatized datasets!", "error");
                return;
            }
        }

        setCurrentStep((prev) => prev + 1);
    };

    const handleMetadataSave = (id, shouldIncreaseStep) => {
        setSubmissionId(id);
        if (shouldIncreaseStep) {
            setCurrentStep((prev) => prev + 1);
        }
    };

    return (
        <Box display="flex" height="100vh">
            {/* Stepper Component */}
            <SubmissionStepper currentStep={currentStep} handleStepClick={handleStepClick} />

            {/* Step Content */}
            <Box
                flex={1}
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                sx={{
                    overflowY: "auto",
                    maxHeight: "100vh",
                }}
            >
                {/* Navigation Buttons */}
                <Box display="flex" justifyContent="center" gap={5} mb={2}>
                    <Button
                        variant="soft"
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        startDecorator={<West />}
                        disabled={currentStep === 0}
                        sx={{ fontSize: "1.2rem" }}
                    >
                        Back
                    </Button>
                    <Button
                        variant="soft"
                        onClick={handleNext}
                        endDecorator={currentStep === 2 ? <Publish /> : <East />}
                        disabled={currentStep === 3}
                        sx={{ fontSize: "1.2rem" }}
                    >
                        {currentStep === 2 ? "Submit" : "Next"}
                    </Button>
                </Box>


                {/* Step Components */}
                <Box
                    flex={1}
                    width="100%"
                    maxWidth="1050px"
                    overflow="auto"
                    padding={2}
                    boxShadow="sm"
                    bgcolor="background.surface"
                    borderRadius="sm"
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
                            initialMetadata={metadata}
                            onMetadataSave={handleMetadataSave}
                            submissionId={submissionId}
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
