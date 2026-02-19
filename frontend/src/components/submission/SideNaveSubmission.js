import * as React from 'react';
import Box from '@mui/joy/Box';
import StepIndicator, {stepIndicatorClasses} from "@mui/joy/StepIndicator";
import {Divider, Step, stepClasses, Stepper, Typography} from "@mui/joy";
import {BarChart, CloudUploadRounded, GetAppRounded, InfoRounded, ListAlt} from "@mui/icons-material";

export function SideNaveSubmission({ currentStep, handleStepClick, quota }) {

    return (
        <Box
            component="nav"
            className="Navigation"
            sx={{

                width: '260px',
                position: 'sticky',
                top: 0,
                minHeight: "calc(100vh - 65.5px)",
                overflowY: 'auto',
                p: 2,
                bgcolor: 'background.surface',
                borderRight: '1px solid',
                borderColor: 'divider',
                display: {
                    xs: 'none',
                    sm: 'block',
                },
            }}
        >

            {quota && (
                <Box sx={{ 
                    mb: 3, p: 2, borderRadius: 'sm', 
                    bgcolor: 'background.level1', border: '1px solid', borderColor: 'divider'
                }}>
                    <Typography level="body-xs" sx={{ fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                        Daily Submission Quota
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5, mt: 0.5 }}>
                        <Typography 
                            level="h3" 
                            color={quota.remaining === 0 ? 'danger' : 'primary'}
                        >
                            {quota.remaining ?? 0}
                        </Typography>
                        <Typography level="body-sm">
                            / {quota.limit ?? '-'} left
                        </Typography>
                    </Box>
                    <Typography level="body-xs" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Resets on a rolling 24h basis.
                    </Typography>
                </Box>
            )}
            
            <Divider />

            <Stepper
                orientation="vertical"
                size="lg"
                sx={{
                    paddingTop: '35px',
                    paddingX: '12px',
                    "--StepIndicator-size": "3rem",
                    "--Stepper-verticalGap": "4rem",
                    "--Step-connectorThickness": "5px",
                    [`& .${stepIndicatorClasses.root}`]: {
                        borderWidth: 4,
                    },
                    [`& .${stepClasses.completed}`]: {
                        [`& .${stepIndicatorClasses.root}`]: {
                            borderColor: "success.600",
                            color: "common.white",
                            backgroundColor: "success.600",
                        },
                        "&::after": {
                            bgcolor: "success.600",
                        },
                    },
                    [`& .${stepClasses.active}`]: {
                        [`& .${stepIndicatorClasses.root}`]: {
                            borderColor: "currentColor",
                        },
                    },
                    [`& .${stepClasses.disabled} *`]: {
                        color: "neutral.outlinedDisabledColor",
                    },
                }}
            >
                <Step
                    completed={currentStep > 0}
                    active={currentStep === 0}
                    indicator={
                        <StepIndicator
                            variant="soft"
                            color={currentStep === 0 ? "primary" : "neutral"}
                            onClick={() => handleStepClick(0)}
                        >
                            <ListAlt />
                        </StepIndicator>
                    }
                >
                    <Typography sx={{marginLeft: '10px'}} color={currentStep === 0 ? 'primary': ''}>Dataset Overview</Typography>
                </Step>
                <Step
                    completed={currentStep > 1}
                    active={currentStep === 1}
                    indicator={
                        <StepIndicator
                            variant="soft"
                            color={currentStep === 1 ? "primary" : "neutral"}
                            onClick={() => handleStepClick(1)}
                        >
                            <GetAppRounded />
                        </StepIndicator>
                    }
                >
                    <Typography sx={{marginLeft: '10px'}} color={currentStep === 1 ? 'primary': ''}>Download Datasets</Typography>
                </Step>
                <Step
                    completed={currentStep > 2}
                    active={currentStep === 2}
                    indicator={
                        <StepIndicator
                            variant="soft"
                            color={currentStep === 2 ? "primary" : "neutral"}
                            onClick={() => handleStepClick(2)}
                        >
                            <InfoRounded />
                        </StepIndicator>
                    }
                >
                    <Typography sx={{marginLeft: '10px'}} color={currentStep === 2 ? 'primary': ''}>Privatization Method</Typography>
                </Step>
                <Step
                    completed={currentStep > 3}
                    active={currentStep === 3}
                    indicator={
                        <StepIndicator
                            variant="soft"
                            color={currentStep === 3 ? "primary" : "neutral"}
                            onClick={() => handleStepClick(3)}
                        >
                            <CloudUploadRounded />
                        </StepIndicator>
                    }
                >
                    <Typography sx={{marginLeft: '10px'}} color={currentStep === 3 ? 'primary': ''}>Upload Privatized Datasets</Typography>
                </Step>
                <Step
                    completed={currentStep > 4}
                    active={currentStep === 4}
                    indicator={
                        <StepIndicator variant="soft" color={currentStep === 4 ? "primary" : "neutral"}>
                            <BarChart />
                        </StepIndicator>
                    }
                >
                    <Typography sx={{marginLeft: '10px'}} color={currentStep === 4 ? 'primary': ''}>Model Evaluation</Typography>
                </Step>
            </Stepper>
        </Box>
    );
}
