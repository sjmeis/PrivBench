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

import React, { useEffect, useState } from "react";
import {
  Typography,
  Box,
  Grid,
  Step,
  Stepper,
  Divider,
  Button,
  Tooltip,
  Select,
  Option,
  FormControl,
  FormLabel,
  Chip,
  Stack,
  Card,
  Skeleton
} from "@mui/joy";
import { motion, AnimatePresence } from "framer-motion";
import StepIndicator from "@mui/joy/StepIndicator";
import { Add } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import BenchmarkCard from "../components/ranking/BenchmarkCard";
import { ModuleService } from "../services/ModuleService";
import { fetchRankingFilters } from "../services/RankingsService";
import MainLayout from "../components/layout/MainLayout";

const stepVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.3,
      duration: 0.5,
    },
  }),
};

const BenchmarkSkeletonCard = () => (
  <Card
    sx={{
      height: 180,
      width: "100%",
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      p: 2,
    }}
  >
    <Box>
      <Skeleton variant="text" level="title-sm" width="70%" sx={{ mb: 1 }} />
      <Skeleton variant="text" level="body-xs" width="100%" />
      <Skeleton variant="text" level="body-xs" width="85%" />
    </Box>
    <Skeleton variant="rectangular" height={24} width="40%" sx={{ borderRadius: "sm" }} />
  </Card>
);

const Information = () => {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [availableVersions, setAvailableVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState("");
  const [submissionsBlocked, setSubmissionsBlocked] = useState(false);
  const [loadingModules, setLoadingModules] = useState(false);

  // 1. Fetch available versions on mount and default to newest
  useEffect(() => {
    let isMounted = true;
    const loadVersionFilters = async () => {
      try {
        const filterData = await fetchRankingFilters();
        if (!isMounted) return;

        const versions = filterData.versions || [];
        setAvailableVersions(versions);

        if (versions.length > 0) {
          setSelectedVersion(versions[0]);
        }
      } catch (err) {
        console.error("Failed to fetch version filters:", err);
      }
    };

    loadVersionFilters();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Fetch modules whenever selectedVersion changes
  useEffect(() => {
    if (!selectedVersion) return;

    let isMounted = true;
    const fetchModulesForVersion = async () => {
      try {
        setLoadingModules(true);
        const filterData = await fetchRankingFilters(selectedVersion);
        if (!isMounted) return;
        setModules(filterData.modules || []);
      } catch (err) {
        console.error("Failed to load modules for version:", err);
      } finally {
        if (isMounted) setLoadingModules(false);
      }
    };

    fetchModulesForVersion();
    return () => {
      isMounted = false;
    };
  }, [selectedVersion]);

  // 3. Check for pending updates
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
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: 4,
          width: "100%",
          boxSizing: "border-box",
          display: "flex",
          justifyContent: "center",
        }}
      >
        <Grid container spacing={3}>
          {/* Submission Process Steps */}
          <Grid sx={{ height: "auto" }} item xs={12} md={4}>
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
                      <Typography level="title-sm" sx={{ fontWeight: "bold" }}>
                        {step.title}
                      </Typography>
                      <Typography level="body-sm">{step.description}</Typography>
                    </Step>
                  </motion.div>
                ))}
              </Stepper>
            </Box>
          </Grid>

          <Divider sx={{ margin: 2, display: { xs: "none", md: "block" } }} orientation="vertical" />

          {/* Benchmark Modules & Version Selection */}
          <Grid item sx={{ height: "auto" }} xs={12} md={7}>
            <Box sx={{ height: "90%", minHeight: "350px" }}>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 1.5,
                  marginBottom: 2,
                }}
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <Typography level="h3">Benchmarking Modules</Typography>
                  <Chip color="primary" variant="soft" size="sm">
                    {modules.length} {modules.length === 1 ? "module" : "modules"}
                  </Chip>
                </Stack>

                {availableVersions.length > 0 && (
                  <FormControl size="sm" sx={{ minWidth: "150px" }}>
                    <FormLabel sx={{ fontSize: "11px" }}>PrivBench Release</FormLabel>
                    <Select
                      size="sm"
                      value={selectedVersion}
                      onChange={(event, newValue) => setSelectedVersion(newValue || "")}
                    >
                      {availableVersions.map((ver) => (
                        <Option key={ver} value={ver}>
                          v{ver}
                        </Option>
                      ))}
                    </Select>
                  </FormControl>
                )}
              </Box>

              {/* Smooth Animated Grid */}
              <Box sx={{ position: "relative", minHeight: "300px" }}>
                <AnimatePresence mode="wait">
                  {loadingModules ? (
                    <motion.div
                      key="skeleton-loader"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <Grid container spacing={2}>
                        {Array.from({ length: modules.length || 8 }).map((_, idx) => (
                          <Grid item xs={6} sm={4} md={3} key={`skeleton-${idx}`}>
                            <BenchmarkSkeletonCard />
                          </Grid>
                        ))}
                      </Grid>
                    </motion.div>
                  ) : (
                    <motion.div
                      key={`modules-version-${selectedVersion}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                    >
                      <Grid container spacing={2}>
                        {modules.map((module) => (
                          <Grid
                            sx={{ maxHeight: "200px", maxWidth: "200px" }}
                            key={module.id}
                            item
                            xs={6}
                            sm={4}
                            md={3}
                          >
                            <BenchmarkCard
                              title={module.title || module.name}
                              description={
                                module.description || "No description available."
                              }
                            />
                          </Grid>
                        ))}
                      </Grid>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </Box>

            <Box
              sx={{
                marginTop: 3,
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