import React, {useState, useEffect} from "react";
import {Box, Button} from "@mui/joy";
import { Done, East, West} from "@mui/icons-material";
import {useLocation} from "react-router-dom";
import {useSnackbar} from "../contexts/SnackbarProvider";
import DownloadStep from "../components/submission/DownloadStep";
import MetadataStep from "../components/submission/MetadataStep";
import UploadStep from "../components/submission/UploadStep";
import FinalStep from "../components/submission/FinalStep";
import {getUserSubmissions} from '../services/RankingsService';
import {SideNaveSubmission} from "../components/submission/SideNaveSubmission";


const Upload = () => {
    const location = useLocation();
    const {state} = location;

    const [currentStep, setCurrentStep] = useState(state?.currentStep || 0);
    const [submissionId, setSubmissionId] = useState(state?.submissionId || null);
    const [downloadedDatasets, setDownloadedDatasets] = useState([]);
    const [datasets, setDatasets] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({});
    const [metadata, setMetadata] = useState(state?.metadata || null);

    const {showSnackbar} = useSnackbar();

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
        <Box sx={{
            display: 'flex',
            minHeight: "calc(100vh - 65.5px)",
            bgcolor: 'background.body',
            marginTop: '-10px',
            marginBottom: '-40px',
            marginLeft: '-40px',
            marginRight: '-40px'
        }}>

            <SideNaveSubmission currentStep={currentStep} handleStepClick={handleStepClick}/>

            <Box sx={{flex: 1, p: 3}}>

                {currentStep !== 3 && <Box
                    sx={{
                        position: "fixed",
                        bottom: 0,
                        left: 0,
                        marginLeft: '260px',
                        width: "calc(100vw - 260px )",
                        p: 3,
                        display: "flex",
                        justifyContent: "flex-end",
                        gap: 2,
                        bgcolor: 'white',
                        // borderTop: '1px solid',
                        // borderColor: 'divider',
                    }}
                >
                    <Button
                        sx={{width: '133px'}}
                        variant="soft"
                        color='neutral'
                        onClick={() => setCurrentStep((prev) => prev - 1)}
                        startDecorator={<West/>}
                        disabled={currentStep === 0}
                        size='lg'
                    >
                        Back
                    </Button>
                    <Button
                        sx={{width: '133px'}}
                        variant="solid"
                        color={currentStep === 2 ? 'success': 'primary' }
                        onClick={handleNext}
                        endDecorator={currentStep === 2 ? <Done/> : <East/>}
                        size='lg'
                    >
                        {currentStep === 2 ? "Submit" : "Next"}
                    </Button>
                </Box>}

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

                    {currentStep === 3 && <FinalStep/>}
                </Box>
            </Box>
        </Box>
    );
};

export default Upload;
