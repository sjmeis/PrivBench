import {Box, Breadcrumbs, Card, CardContent, Grid} from "@mui/joy";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Link from "@mui/joy/Link";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Typography from "@mui/joy/Typography";
import React, {useEffect, useState} from "react";
import {useLocation} from "react-router-dom";
import {fetchSubmissionDetails} from "../services/RankingsService"
import LoadingSpinner from "../components/shared/LoadingSpinner";
import ModelCard from "../components/cards/ModelCard";
import ChartCard from "../components/cards/ChartCard";
import CircularProgressCountUp from "../components/CircularProgressCountUp";
import UserCard from "../components/cards/UserCard";
import BenchmarkingModulesOverview from "../components/BenchmarkingModulesOverview";

const RankingDetailView = () => {
    const {state} = useLocation();
    const [submission, setSubmission] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true)


    useEffect(() => {
        if (state.id) {
            const getSubmissionDetails = async () => {
                const data = await fetchSubmissionDetails(state.id);
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
    }, [state.id]);


    const cardStyle = {
        minHeight: '35vh',
        '&:hover': {
            borderColor: 'primary.500',
            transform: 'scale(1.02)',
            transition: 'transform 0.2s ease-in-out',
        },
        overflow: 'hidden'
    }
    return (
        !loading && submission ? <Box>
            <Box sx={{display: 'flex', alignItems: 'center', paddingBottom: '20px'}}>
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
                        Detailview
                    </Typography>
                </Breadcrumbs>
            </Box>
            <Box>
                <Grid container spacing={3}>
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
        </Box>
:
    <LoadingSpinner/>

);
}

export default RankingDetailView;