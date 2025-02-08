import * as React from "react";
import {useEffect, useState} from "react";
import {useNavigate} from "react-router-dom";
import {updateSubmissionVisibility} from "../../services/RankingsService";
import * as rankingService from "../../services/RankingsService";
import {Stack, Box, Card, Divider, Typography, Button, Sheet, Table, CardOverflow, CardActions} from "@mui/joy";
import AddIcon from '@mui/icons-material/Add';
import UserSubmissionsTableRow from "./UserSubmissionsTableRow";
import UpdateSubmissionModal from "./UpdateSubmissionModal";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const UserSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [pendingSubmission, setPendingSubmission] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [submission, setSubmission] = useState(null);
    const { showSnackbar } = useSnackbar();


    const fetchSubmissions = async () => {
        try {
            const data = await rankingService.getUserSubmissions();
            setSubmissions(data.submissions);

            const pending = data.submissions.find(submission => submission.status === "Pending");
            setPendingSubmission(pending);
        } catch (err) {
            showSnackbar(err.message || 'Failed to fetch submissions');
        }
    };

    useEffect(() => {
        fetchSubmissions();
        // eslint-disable-next-line
    }, []);

    const onTogglePublic = async (submissionId, newVisibility) => {
        try {
            await updateSubmissionVisibility(submissionId, newVisibility);
            fetchSubmissions();
        } catch (error) {
            console.error('Failed to update submission visibility:', error);
        }
    };

    const navigate = useNavigate();

    const onUpdateSubmissionClick = (submission) => {
        console.log(submission)
        setSubmission(submission)
        setIsModalOpen(true)
    }

    const onClose = () => {
        fetchSubmissions()
        setIsModalOpen(false)
        setSubmission(null)
    }

    const handleAddClick = () => {
        if (pendingSubmission) {
            // Navigate to /upload with the required state
            navigate("/upload", {
                state: {
                    currentStep: 1,
                    submissionId: pendingSubmission.id,
                    metadata: pendingSubmission.metadata,
                }
            });
        } else {
            // Optionally handle if no "Pending" submission exists
            console.log("No pending submission found.");
        }
    };

    return (
        <>
            <Stack spacing={4} sx={{maxWidth: '1100px', mx: 'auto'}}>
                <Typography level="h4">Submissions</Typography>
                {submissions.length > 0 &&
                    <Box sx={{flex: 1, width: '100%'}}>
                        <Stack
                            spacing={4}
                            sx={{
                                display: 'flex',
                                mx: 'auto',
                                px: {xs: 2, md: 6},
                                py: {xs: 2, md: 3},
                            }}
                        >
                            <Card>
                                <Box sx={{mb: 1}}>
                                    <Typography level="title-md">Overview of submissions</Typography>
                                    <Typography level="body-sm">
                                        Make Submission Public to visualize them on the leaderboard and earn badges
                                    </Typography>
                                </Box>
                                <Divider/>
                                <Sheet>
                                    <Table
                                        aria-label="collapsible submissions table"
                                        sx={{
                                            '& > thead > tr > th:nth-child(n + 3), & > tbody > tr > td:nth-child(n + 3)': {
                                                textAlign: 'left',
                                            },
                                        }}
                                    >
                                        <thead>
                                        <tr>
                                            <th style={{width: 5}} aria-label="empty"/>
                                            <th style={{width: 20}}>Name</th>
                                            <th style={{width: 20}}>Timestamp</th>
                                            <th style={{width: 20}}>Status</th>
                                            <th style={{width: 20}}>Score</th>
                                            <th style={{width: 15}} align="center">Public/Private</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {submissions.map((submission) => (
                                            <UserSubmissionsTableRow key={submission.id} row={submission}
                                                                     onUpdateSubmission={onUpdateSubmissionClick}
                                                                     onTogglePublic={onTogglePublic}/>
                                        ))}
                                        </tbody>
                                    </Table>
                                </Sheet>
                                <CardOverflow sx={{borderTop: '1px solid', borderColor: 'divider'}}>
                                    <CardActions sx={{alignSelf: 'flex-end', pt: 2}}>
                                        <Button
                                            onClick={handleAddClick}
                                            endDecorator={<AddIcon/>}
                                            size="sm"
                                            color="success"
                                            variant="soft"
                                            disabled={!pendingSubmission} // Disable if no pending submission
                                        >
                                            Add
                                        </Button>
                                    </CardActions>
                                </CardOverflow>
                            </Card>
                        </Stack>
                    </Box>
                }
            </Stack>
            <UpdateSubmissionModal isOpen={isModalOpen} submission={submission} onClose={onClose}/>

        </>
    );
};

export default UserSubmissions;
