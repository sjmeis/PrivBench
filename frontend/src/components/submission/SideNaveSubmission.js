import * as React from 'react';
import Box from '@mui/joy/Box';
import StepIndicator, {stepIndicatorClasses} from "@mui/joy/StepIndicator";
import {Divider, Step, stepClasses, Stepper, Typography} from "@mui/joy";
import {BarChart, CloudUploadRounded, GetAppRounded, InfoRounded, ListAlt} from "@mui/icons-material";

export function SideNaveSubmission({ currentStep, handleStepClick, quota, disabled }) {

    const steps = [
        { label: "Dataset Overview", icon: <ListAlt /> },
        { label: "Download Datasets", icon: <GetAppRounded /> },
        { label: "Privatization Method", icon: <InfoRounded /> },
        { label: "Upload Privatized Datasets", icon: <CloudUploadRounded /> },
        { label: "Model Evaluation", icon: <BarChart /> },
    ];

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
                            / {quota.limit !== undefined ? quota.limit : '-'} left
                        </Typography>
                    </Box>
                    <Typography level="body-xs" sx={{ mt: 1, fontStyle: 'italic' }}>
                        Resets on a rolling 24h basis.
                    </Typography>
                </Box>
            )}
            
            <Divider />

            <Stepper orientation="vertical" size="lg" sx={{
                paddingTop: '35px',
                paddingX: '12px',
                "--StepIndicator-size": "3rem",
                "--Stepper-verticalGap": "4rem",
                "--Step-connectorThickness": "5px",
                [`& .${stepIndicatorClasses.root}`]: { borderWidth: 4 },
                [`& .${stepClasses.completed}`]: {
                    [`& .${stepIndicatorClasses.root}`]: {
                        borderColor: "success.600",
                        color: "common.white",
                        backgroundColor: "success.600",
                    },
                    "&::after": { bgcolor: "success.600" },
                },
            }}>
                {steps.map((step, index) => (
                    <Step
                        key={index}
                        completed={currentStep > index}
                        active={currentStep === index}
                        indicator={
                            <StepIndicator
                                variant="soft"
                                color={currentStep === index ? "primary" : "neutral"}
                                onClick={() => !disabled && handleStepClick(index)}
                                sx={{ 
                                    cursor: disabled ? 'not-allowed' : 'pointer',
                                    // Grey out if we are locked in another step
                                    ...(disabled && currentStep !== index && {
                                        filter: 'grayscale(1)',
                                        opacity: 0.5
                                    })
                                }}
                            >
                                {step.icon}
                            </StepIndicator>
                        }
                    >
                        <Typography 
                            sx={{
                                marginLeft: '10px',
                                opacity: disabled && currentStep !== index ? 0.5 : 1
                            }} 
                            color={currentStep === index ? 'primary': ''}
                        >
                            {step.label}
                        </Typography>
                    </Step>
                ))}
            </Stepper>
        </Box>
    );
}
