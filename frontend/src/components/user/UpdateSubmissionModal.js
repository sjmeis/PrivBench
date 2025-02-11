import React, {useEffect, useState} from "react";
import {
    Box,
    Button,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Modal,
    ModalClose,
    ModalDialog, Typography
} from "@mui/joy";
import {InfoOutlined, CloudDownload, RemoveRedEye, Close, Update} from "@mui/icons-material";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import {DatasetService} from '../../services/DatasetService';
import {TaskService} from '../../services/TaskService';
import {BenchmarkService} from '../../services/BenchmarkService';
import DatasetTableUpdate from '../submission/DatasetTableUpdate';
import ScoreOverviewCard from "../submission/ScoreOverviewCard";
import TaskProgressCard from "../submission/TaskProgressCard";

const UpdateSubmissionModal = ({isOpen, onClose, submission}) => {
    const [datasets, setDatasets] = useState([]);
    const [uploadedFiles, setUploadedFiles] = useState({});
    const [uploadingDatasetId, setUploadingDatasetId] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [moduleScores, setModuleScores] = useState([]);
    const [averageScore, setAverageScore] = useState(null);
    const {showSnackbar} = useSnackbar();

    useEffect(() => {
        if (!submission) {
            return;
        }

        const fetchData = async () => {
            try {
                await DatasetService.fetchAllDatasetsForUpdate(submission.id)
                    .then(data => setDatasets(data.datasets))
                    .catch();
            } catch (error) {
                showSnackbar('Failed to fetch data', 'error');
            }
        };

        if (isOpen) {
            fetchData();
        }
    }, [isOpen, submission]);


    useEffect(() => {
        if (tasks.length === 0) return;

        const pollTasks = async () => {
            const token = localStorage.getItem("token");

            const updatedTasks = await BenchmarkService.pollTasks(tasks, token, showSnackbar);

            setTasks(updatedTasks);

            const allTasksFinished = updatedTasks.every(
                (task) => task.completed || task.error || task.state === "FAILURE"
            );

            if (allTasksFinished) {
                setLoading(false);
                const successfulTasks = updatedTasks.filter(
                    (task) => task.completed && task.score !== null
                );

                if (successfulTasks.length > 0) {
                    const scores = successfulTasks.map((t) => ({
                        module_name: t.module_name,
                        score: t.score,
                    }));
                    setModuleScores(scores);
                    const s = scores.concat(submission.benchmarkScores)
                    setAverageScore(
                        s.reduce((sum, curr) => sum + curr.score, 0) / s.length
                    );
                }
            }
        };

        const intervalId = setInterval(pollTasks, 1000);
        return () => clearInterval(intervalId);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks.length]);

    const isFormValid = () => {
        return Array.isArray(datasets) && datasets.every(dataset => uploadedFiles[dataset.id]);
    }

    const updateSubmission = async () => {
        if (!isFormValid()) {
            showSnackbar("Please upload all required datasets", "error");
            return;
        }

        try {
            setLoading(true);
            const data = await BenchmarkService.startBenchmarkUpdate(submission.id);

            if (data.message === "No new modules to benchmark") {
                showSnackbar("No new modules to benchmark", "info");
                return;
            }

            setTasks(data.task_ids.map(task => ({
                ...task,
                progress: 0,
                processedRows: 0,
                totalRows: 0,
                status: 'Starting...',
                completed: false,
                score: null,
                error: null
            })));

        } catch (error) {
            console.error('Error starting benchmark update:', error);
            showSnackbar(error.message || "Failed to start benchmark update", "error");
            setLoading(false);
        }
    };

    useEffect(() => {
        if (tasks.length > 0 && !loading) {
            setLoading(true);
            const cleanup = TaskService.startPolling(
                tasks,
                (updatedTasks) => setTasks(updatedTasks),
                (result) => {
                    setLoading(false);
                    if (result.scores) {
                        setModuleScores(result.scores);
                        const scores = result.scores.concat(submission.benchmarkScores)
                        setAverageScore(
                            scores.reduce((sum, curr) => sum + curr.score, 0) / scores.length
                        );
                    }
                    onClose();
                }
            );
            return cleanup;
        }
    }, [tasks]);

    const handleFileSelect = async (event, originalDatasetId) => {
        const file = event.target.files[0];
        if (!file) return;

        setUploadingDatasetId(originalDatasetId);
        const submissionId = submission.id;

        const result = await DatasetService.uploadPrivatizedDataset({
            file,
            submissionId,
            originalDatasetId,
            setUploadingDatasetId,
            setUploadedFiles,
            event,
        });

        if (result.success) {
            setUploadedFiles((prev) => ({
                ...prev,
                [originalDatasetId]: file,
            }));
            showSnackbar(result.message, "success");
        } else {
            showSnackbar(result.message, "error");
        }
    };

    const handleDownloadMissingDatasets = async () => {
        DatasetService.downloadDatasets(datasets.map(dataset => dataset.name))
            .then(() => {
                showSnackbar("All selected datasets were downloaded successfully!", "success");
            })
            .catch(() => {
                showSnackbar("Error downloading datasets", "error");
            });
    };

    return (
        <Modal
            open={isOpen}
            onClose={onClose}
            sx={{display: "flex", alignItems: "center", justifyContent: "center"}}
        >
            <ModalDialog sx={{width: '90vw', maxWidth: '1200px', overflowX: 'hidden'}}>
                <DialogTitle
                    sx={{
                        alignItems: 'center',
                    }}
                >
                    Update Submission
                    <Typography variant="soft" color="primary">
                        {submission ? submission.name : 'Loading...'}
                    </Typography>
                </DialogTitle>
                <Divider sx={{marginBottom: "10px"}}/>
                <DialogContent sx={{overflowX: 'hidden'}}>
                    {tasks.length === 0 && (
                        <>
                            <Box sx={{mb: 3, flex: 1, display: "flex", flexDirection: "column", gap: 2}}>
                                <Typography level="h5" fontWeight="bold">
                                    Step 1: Download missing datasets
                                </Typography>
                                <Box sx={{textAlign: "center"}}>
                                    <Button
                                        fullWidth
                                        variant="solid"
                                        startDecorator={<CloudDownload/>}
                                        onClick={handleDownloadMissingDatasets}
                                        disabled={datasets.length === 0}
                                    >
                                        Download Missing Datasets
                                    </Button>
                                </Box>
                            </Box>
                            <Box sx={{flex: 1, display: "flex", flexDirection: "column", gap: 2}}>
                                <Typography level="h5" fontWeight="bold">
                                    Step 2: Upload of privatized datasets for missing benchmarking modules
                                </Typography>

                                <Typography sx={{marginY: 2, p: 1}} startDecorator={<InfoOutlined/>} variant='soft'
                                            color='neutral' level="body1">
                                    For every dataset listed below there needs to be uploaded the privatized counterpart
                                    in
                                    .csv
                                    format
                                </Typography>
                                {datasets.length > 0 &&
                                    <DatasetTableUpdate
                                        datasets={datasets}
                                        uploadedFiles={uploadedFiles}
                                        uploadingDatasetId={uploadingDatasetId}
                                        onFileSelect={handleFileSelect}
                                    />
                                }

                            </Box>
                        </>
                    )
                    }

                    {tasks.length > 0 && submission && (
                        moduleScores.length > 0 ? (
                            <>
                                <Typography level="h3" mb={2}>
                                   Updated Results
                                </Typography>
                                <ScoreOverviewCard oldModulesScores={submission.benchmarkScores} moduleScores={moduleScores} averageScore={averageScore} />
                                <Button
                                    fullWidth
                                    variant="solid"
                                    color="primary"
                                    sx={{ mt: 3 }}
                                    onClick={() => onClose()}
                                    endDecorator={<RemoveRedEye />}
                                >
                                    View My Submissions
                                </Button>
                            </>
                        ) : (
                            <>
                                <Typography level="h3">
                                    Evaluation in Progress
                                </Typography>
                                <TaskProgressCard tasks={tasks} />
                            </>

                        )
                    )}

                </DialogContent>
                {tasks.length === 0 && (
                    <DialogActions>

                        <Button
                            onClick={updateSubmission}
                            disabled={!isFormValid() || loading}
                            color={isFormValid() ? 'success' : 'primary'}
                            endDecorator={<Update />}
                        >
                            Update Submission
                        </Button>
                        <Button onClick={onClose} variant='soft' color='neutral' disabled={loading} startDecorator={<Close />}>
                            {loading ? 'Please wait...' : 'Close'}
                        </Button>
                    </DialogActions>
                )
                }
                <ModalClose/>
            </ModalDialog>
        </Modal>
    )
}

export default UpdateSubmissionModal;