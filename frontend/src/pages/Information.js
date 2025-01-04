import React, {useEffect, useState} from 'react';
import axios from 'axios';
import {Typography, Box, Grid, Step, Stepper, Divider, Button} from '@mui/joy';
import StepIndicator from "@mui/joy/StepIndicator";
import {Add} from "@mui/icons-material";
import {useNavigate} from "react-router-dom";
import BenchmarkCard from "../components/ranking/BenchmarkCard";

const Information = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    //fixme: remove this dummy data after some moduels have been added
    const BENCHMARK_DESCRIPTIONS = [
        {
            title: "Membership Inference – Masked Token Prediction",
            description: "Tests a privatization method's ability to defend against masked token prediction. Here, an attacker is simulated who attempts to infer tokens from the original text by leveraging the surrounding context. An effective privatization method should not divulge information about the original content given the private context."
        },
        {
            title: "Membership Inference – Nearest Neighbors",
            description: "Evaluates the level of plausible deniability granted by a privatization method. Given the private dataset, we check how semantically distant a private text is to its original counterpart. The further away this distance is on average, the higher degree of deniability that is afforded."
        }
    ];

    const navigate = useNavigate();

    useEffect(() => {
        const fetchModules = async () => {
            try {
                const response = await axios.get('http://localhost:5000/modules'); // Adjust endpoint as needed
                setModules(response.data.concat(BENCHMARK_DESCRIPTIONS));
            } catch (err) {
                setError('Failed to load modules');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchModules();
    }, []);

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: 4,
            }}
        >
            <Grid container spacing={3}>
                <Grid sx={{height: '80vh'}} item xs={4}>
                    <Box>
                        <Typography sx={{marginBottom: 3}} level='h3'>Submission Process</Typography>
                        <Stepper orientation="vertical" sx={{'--Stepper-verticalGap': '2rem'}}>
                            <Step
                                completed
                                indicator={<StepIndicator variant="soft" color="success">1</StepIndicator>}
                            >
                                <Typography level="body1" sx={{fontWeight: 'bold'}}>
                                    Download Datasets
                                </Typography>
                                <Typography level="body2">
                                    Start by downloading datasets from our platform containing sensitive personal data.
                                </Typography>
                            </Step>
                            <Step
                                completed
                                indicator={<StepIndicator variant="soft" color="success">2</StepIndicator>}
                            >
                                <Typography level="body1" sx={{fontWeight: 'bold'}}>
                                    Fill Metadata Form
                                </Typography>
                                <Typography level="body2">
                                    Complete a metadata form detailing the chosen data privatization technique.
                                </Typography>
                            </Step>
                            <Step
                                active
                                indicator={<StepIndicator variant="soft" color="success">3</StepIndicator>}
                            >
                                <Typography level="body1" sx={{fontWeight: 'bold'}}>
                                    Apply Data Privatization
                                </Typography>
                                <Typography level="body2">
                                    Apply your own data privatization algorithm to the downloaded datasets.
                                </Typography>
                            </Step>
                            <Step
                                active
                                indicator={<StepIndicator variant="soft" color="success">4</StepIndicator>}
                            >
                                <Typography level="body1" sx={{fontWeight: 'bold'}}>
                                    Upload Privatized Data
                                </Typography>
                                <Typography level="body2">
                                    Upload the privatized datasets back to our platform for evaluation.
                                </Typography>
                            </Step>
                            <Step
                                active
                                indicator={<StepIndicator variant="soft" color="success">5</StepIndicator>}
                            >
                                <Typography level="body1" sx={{fontWeight: 'bold'}}>
                                    Evaluation
                                </Typography>
                                <Typography level="body2">
                                    Our platform evaluates the privatized datasets to assess privacy preservation and
                                    data utility.
                                </Typography>
                            </Step>
                        </Stepper>
                        <Box sx={{marginTop: 1, marginBottom: 1, display: 'flex', justifyContent: 'flex-end'}}>
                            <Button variant='soft' onClick={() => navigate('/upload')} color='success' startDecorator={<Add/>}>Try
                                Out</Button>
                        </Box>

                    </Box>
                </Grid>
                <Divider sx={{margin: 2, height: 'auto'}} orientation="vertical"/>
                <Grid item sx={{height: '80vh'}} xs={7}>
                    <Box sx={{height: '100%'}}>
                        <Typography level="h3" sx={{marginBottom: 2}}>
                            Privatization benchmarking modules
                        </Typography>
                        <Grid container spacing={2}>
                            {modules.map((module) => (
                                <Grid
                                    key={module.id}
                                    item
                                    xs={3}
                                >
                                    <BenchmarkCard
                                        title={module.title}
                                        description={module.description || 'No description available.'}
                                    />
                                </Grid>
                            ))}
                        </Grid>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};

export default Information;