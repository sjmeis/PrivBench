import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Card from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
import CardOverflow from "@mui/joy/CardOverflow";
import CardActions from "@mui/joy/CardActions";
import * as React from "react";
import {useEffect, useState} from "react";
import * as rankingService from "../../services/RankingsService";
import Table from '@mui/joy/Table';
import Sheet from '@mui/joy/Sheet';
import Button from "@mui/joy/Button";
import AddIcon from '@mui/icons-material/Add';
import {useNavigate} from "react-router-dom";
import {updateSubmissionVisibility} from "../../services/RankingsService";
import UserSubmissionsTableRow from "./UserSubmissionsTableRow";

const UserSubmissions = () => {
    const [submissions, setSubmissions] = useState([]);
    const [error, setError] = useState(null);

    const fetchSubmissions = async () => {
        try {
            const data = await rankingService.getUserSubmissions();
            setSubmissions(data.submissions);
        } catch (err) {
            setError(err.message || 'Failed to fetch submissions');
        }
    };

    useEffect(() => {

        fetchSubmissions();
    }, []);


    const onTogglePublic = async (submissionId, newVisibility) => {
        try {
            await updateSubmissionVisibility(submissionId, newVisibility);
            fetchSubmissions();
            //todo: use applicaiton weide toast messages
        } catch (error) {
            console.error('Failed to update submission visibility:', error);
            //todo: error message across application the same
        }
    };


    const navigate = useNavigate();

    return (<Stack spacing={4} sx={{maxWidth: '800px', mx: 'auto'}}>
        <Typography level="h4">Submissions</Typography>
        <Box sx={{flex: 1, width: '100%'}}>
            <Stack
                spacing={4}
                sx={{
                    display: 'flex',
                    maxWidth: '800px',
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
                                    textAlign: 'right',
                                },
                            }}
                        >
                            <thead>
                            <tr>
                                <th style={{width: 40}} aria-label="empty"/>
                                <th>Name</th>
                                <th>Timestamp</th>
                                <th>Status</th>
                                <th>Score</th>
                                <th align="center">Public/Private</th>
                            </tr>
                            </thead>
                            <tbody>
                            {submissions.map((submission) => (
                                <UserSubmissionsTableRow key={submission.id} row={submission} onTogglePublic={onTogglePublic}/>
                            ))}
                            </tbody>
                        </Table>
                    </Sheet>
                    <CardOverflow sx={{borderTop: '1px solid', borderColor: 'divider'}}>
                        <CardActions sx={{alignSelf: 'flex-end', pt: 2}}>
                            <Button onClick={() => navigate('/upload')} endDecorator={<AddIcon/>} size="sm"
                                    color='success' variant="soft">
                                Add
                            </Button>
                        </CardActions>
                    </CardOverflow>
                </Card>
            </Stack>
        </Box>
    </Stack>)
}




export default UserSubmissions;