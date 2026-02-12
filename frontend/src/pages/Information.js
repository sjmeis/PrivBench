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
import Footer from "../components/shared/Footer";

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
        "Start by downloading datasets from our platform containing sensitive personal data.",
    },
    {
      title: "Fill Metadata Form",
      description:
        "Complete a metadata form detailing the chosen data privatization technique.",
    },
    {
      title: "Apply Data Privatization",
      description:
        "Apply your own data privatization algorithm to the downloaded datasets.",
    },
    {
      title: "Upload Privatized Data",
      description:
        "Upload the privatized datasets back to our platform for evaluation.",
    },
    {
      title: "Evaluation",
      description:
        "Our platform evaluates the privatized datasets to assess privacy preservation and data utility.",
    },
  ];

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
        paddingY: 4,
      }}
    >
      <Grid container spacing={3}>
        <Grid sx={{ height: "80vh" }} item xs={4}>
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
        <Grid item sx={{ height: "80vh" }} xs={7}>
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
      <Footer />
    </Box>
  );
};

export default Information;
