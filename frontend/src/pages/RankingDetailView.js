

import {Box, Breadcrumbs, Button, Card, CardContent, Grid} from "@mui/joy";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import Link from "@mui/joy/Link";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Typography from "@mui/joy/Typography";
import React, {useEffect, useState} from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {fetchSubmissionDetails} from "../services/RankingsService"
import LoadingSpinner from "../components/shared/LoadingSpinner";
import ModelCard from "../components/ranking/ModelCard";
import ChartCard from "../components/ranking/ChartCard";
import CircularProgressCountUp from "../components/ranking/CircularProgressCountUp";
import UserCard from "../components/ranking/UserCard";
import BenchmarkingModulesOverview from "../components/shared/BenchmarkingModulesOverview";
import MainLayout from "../components/layout/MainLayout";
import { useSnackbar } from "../contexts/SnackbarProvider";

const RankingDetailView = () => {
    const { id } = useParams();
    const [submission, setSubmission] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true)
    const [copied, setCopied] = useState(false);
    const { showSnackbar } = useSnackbar();

    const [searchParams] = useSearchParams();
    const versionParam = searchParams.get("version");

   useEffect(() => {
        if (id) {
            const getSubmissionDetails = async () => {
                setLoading(true);
                const data = await fetchSubmissionDetails(id, versionParam);
                if (data.error) {
                    setError(data.error);
                    setLoading(false)
                } else {
                    setSubmission(data);
                    setLoading(false)
                }
            };

            getSubmissionDetails();
        }
    }, [id]);

    const handleShare = async () => {
        try {
            await navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            showSnackbar("Link copied to clipboard!", "success");
            
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            showSnackbar("Failed to copy link", "danger");
        }
    };

    const cardStyle = {
        height: '100%',
        minHeight: '35vh',
        '&:hover': {
            borderColor: 'primary.500'
        },
        overflow: 'hidden'
    }
    return (
        <MainLayout>
            <Box sx={{ minHeight: '80vh' }}>
            {loading ? (
                <LoadingSpinner />
            ) : (
                <>
                <Box sx={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '20px'}}>
                    <Breadcrumbs
                        size="sm"
                        aria-label="breadcrumbs"
                        separator={<ChevronRightRoundedIcon fontSize="sm"/>}
                        sx={{pl: 0}}
                    >
                        <Link
                            underline="none"
                            color="neutral"
                            href="/"
                            aria-label="Home"
                        >
                            <HomeRoundedIcon/>
                        </Link>
                        <Link
                            underline="hover"
                            color="neutral"
                            href="/rankings"
                            sx={{fontSize: 12, fontWeight: 500}}
                        >
                            Ranking
                        </Link>
                        <Typography color="primary" sx={{fontWeight: 500, fontSize: 12}}>
                            Detailed View
                        </Typography>
                    </Breadcrumbs>
                    <Button
                        size="sm"
                        variant="outlined"
                        color="neutral"
                        startDecorator={copied ? <CheckIcon /> : <ContentCopyIcon />}
                        onClick={handleShare}
                        sx={{ borderRadius: 'xl' }}
                    >
                        {copied ? "Link Copied!" : "Share Results?"}
                    </Button>
                </Box>
                <Box>
                    <Grid container spacing={3} sx={{ minHeight: '70vh', mb: 4 }}>
                        <Grid item xs={6}>
                            <ModelCard cardStyle={cardStyle} submission={submission} />
                        </Grid>
                        <Grid item xs={3}>
                            <UserCard user={submission.user} cardStyle={cardStyle}></UserCard>
                        </Grid>
                        <Grid item xs={3}>
                            <Card sx={cardStyle}>
                                <CardContent>
                                    <Typography level='h2'>Overall Score</Typography>
                                    <CircularProgressCountUp overallScore={submission.overallScore} />
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={5}>
                                <ChartCard cardStyle={cardStyle} benchmarkScores={submission.benchmarkScores } overallScore={submission.overallScore}/>
                        </Grid>
                        <Grid item xs={7}>
                            <Card sx={cardStyle}>
                                <BenchmarkingModulesOverview benchmarkScores={submission.benchmarkScores}></BenchmarkingModulesOverview>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
                </>
            )}
            </Box>
        </MainLayout>
);
}

export default RankingDetailView;