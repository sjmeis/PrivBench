import {Box, Breadcrumbs, Card, CardContent, Grid} from "@mui/joy";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import Link from "@mui/joy/Link";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Typography from "@mui/joy/Typography";
import React from "react";
import {useLocation} from "react-router-dom";

const RankingDetailView = () => {
    const {state} = useLocation();

    const cardStyle = {
        minHeight: '35vh',
        '&:hover': {
            borderColor: 'primary.500',
            transform: 'scale(1.02)',
            transition: 'transform 0.2s ease-in-out',
        }
    }
    return (
        <Box>
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
                    <Grid item xs={3}>
                        <Card sx={cardStyle}>
                            <CardContent>
                                <Typography level='h2'>Name and Rank</Typography>
                                <Typography level='h6'>{state.name}</Typography>
                                <Typography level='h6'>{state.submittedBy.username}</Typography>
                                <Typography level='h6'>{state.submittedBy.mailAddress}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={4}>
                        <Card sx={cardStyle}>
                            <CardContent>
                                <Typography level='h2'>Submitted by</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={5}>
                        <Card sx={cardStyle}>
                            <CardContent>
                                <Typography level='h2'>Model Card</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={5}>
                        <Card sx={cardStyle}>
                            <CardContent>
                                <Typography level='h2'>Fancy Graph</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={4}>
                        <Card sx={cardStyle}>
                            <CardContent>
                                <Typography level='h2'>Scoring Models</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={3}>
                        <Card sx={cardStyle}>
                            <CardContent>
                                <Typography level='h2'>Information</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </Box>
    );
}

export default RankingDetailView;