import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Typography,
  Box,
  Grid,
  Step,
  Stepper,
  Divider,
  Button,
  Tooltip,
} from "@mui/joy";
import StepIndicator from "@mui/joy/StepIndicator";
import { Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import BenchmarkCard from "../components/ranking/BenchmarkCard";
import { motion } from "framer-motion";
import { ModuleService } from "../services/ModuleService";
import { API_BASE_URL } from '../config';
import MainLayout from "../components/layout/MainLayout";

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 1,
      duration: 0.5,
    },
  }),
};

const Information = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [submissionsBlocked, setSubmissionsBlocked] = useState(false);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/modules`);
        setModules(response.data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchModules();
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        const flag = await ModuleService.hasPendingModuleUpdates();
        if (!ignore) setSubmissionsBlocked(flag);
      } catch {
        if (!ignore) setSubmissionsBlocked(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const steps = [
    {
      title: "Download Datasets",
      description:
        "Start by downloading the datasets provided by our platform.",
    },
    {
      title: "Fill Metadata Form",
      description:
        "Complete a metadata form detailing the text privatization technique you would like to benchmark.",
    },
    {
      title: "Apply Text Privatization",
      description:
        "Apply your own text privatization method to the downloaded datasets (text column only).",
    },
    {
      title: "Upload Privatized Data",
      description:
        "Upload the privatized datasets back to our platform for evaluation.",
    },
    {
      title: "Evaluation",
      description:
        "Our platform evaluates the privatized datasets to assess privacy preservation and data utility holistically.",
    },
  ];

  return (
    <MainLayout>
    <Box sx={{ 
        px: { xs: 2, md: 4 }, 
        py: 4, 
        width: '100%', 
        boxSizing: 'border-box',
        display: 'flex',
        justifyContent: 'center' 
      }}>
      <Grid container spacing={3}>
        <Grid sx={{ height: "auto" }} item xs={4}>
          <Box>
            <Typography sx={{ marginBottom: 3 }} level="h3">
              Submission Process
            </Typography>
            <Stepper
              orientation="vertical"
              sx={{ "--Stepper-verticalGap": "2rem" }}
            >
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={stepVariants}
                >
                  <Step
                    active
                    indicator={
                      <StepIndicator variant="soft" color="success">
                        {index + 1}
                      </StepIndicator>
                    }
                  >
                    <Typography level="body1" sx={{ fontWeight: "bold" }}>
                      {step.title}
                    </Typography>
                    <Typography level="body2">{step.description}</Typography>
                  </Step>
                </motion.div>
              ))}
            </Stepper>
          </Box>
        </Grid>
        <Divider sx={{ margin: 2, height: "auto" }} orientation="vertical" />
        <Grid item sx={{ height: "auto" }} xs={7}>
          <Box sx={{ height: "90%" }}>
            <Typography level="h3" sx={{ marginBottom: 2 }}>
              Privatization Benchmarking Modules
            </Typography>
            <Grid container spacing={2}>
              {modules.map((module) => (
                <Grid
                  sx={{ maxHeight: "200px", maxWidth: "200px" }}
                  key={module.id}
                  item
                  xs={3}
                >
                  <BenchmarkCard
                    title={module.title}
                    description={
                      module.description || "No description available."
                    }
                  />
                </Grid>
              ))}
            </Grid>
          </Box>
          <Box
            sx={{
              marginTop: 1,
              marginBottom: 1,
              display: "flex",
              justifyContent: "flex-end",
            }}
          >
            <Tooltip
              title={
                submissionsBlocked
                  ? "Submissions are disabled until admin publishes pending module updates."
                  : ""
              }
              variant="outlined"
              arrow
              placement="top"
              disableHoverListener={!submissionsBlocked}
            >
              <span>
                <Button
                  sx={{ width: "250px" }}
                  variant="soft"
                  onClick={() => navigate("/upload")}
                  color="success"
                  startDecorator={<Add />}
                  disabled={submissionsBlocked}
                >
                  Try Out
                </Button>
              </span>
            </Tooltip>
          </Box>
        </Grid>
      </Grid>
      </Box>
    </MainLayout>
  );
};

export default Information;
