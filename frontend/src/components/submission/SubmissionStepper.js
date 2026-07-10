/* Copyright (C) 2026 Stephen Meisenbacher

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.*/

import React from "react";
import { Box, Stepper, Step, Typography, stepClasses } from "@mui/joy";
import StepIndicator, { stepIndicatorClasses } from "@mui/joy/StepIndicator";
import {BarChart, GetAppRounded, CloudUploadRounded, InfoRounded} from "@mui/icons-material";

const SubmissionStepper = ({ currentStep, handleStepClick }) => {
    return (
        <Box
            sx={{
                width: "20%",
                bgcolor: "grey.100",
                padding: 2,
                borderRight: "1px solid grey",
            }}
        >
            <Stepper
                orientation="vertical"
                size="lg"
                sx={{
                    "--StepIndicator-size": "4rem",
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
                            <GetAppRounded />
                        </StepIndicator>
                    }
                >
                    <Typography>Download datasets</Typography>
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
                            <InfoRounded />
                        </StepIndicator>
                    }
                >
                    <Typography>Provide metadata</Typography>
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
                            <CloudUploadRounded />
                        </StepIndicator>
                    }
                >
                    <Typography>Upload privatized datasets</Typography>
                </Step>
                <Step
                    completed={currentStep > 3}
                    active={currentStep === 3}
                    indicator={
                        <StepIndicator variant="soft" color={currentStep === 3 ? "primary" : "neutral"}>
                            <BarChart />
                        </StepIndicator>
                    }
                >
                    <Typography>Model evaluation</Typography>
                </Step>
            </Stepper>
        </Box>
    );
};

export default SubmissionStepper;
