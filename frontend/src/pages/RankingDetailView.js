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

import {
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Dropdown,
  MenuButton,
  Menu,
  MenuItem,
  Stack,
} from "@mui/joy";
import ChevronRightRoundedIcon from "@mui/icons-material/ChevronRightRounded";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckIcon from "@mui/icons-material/Check";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Link from "@mui/joy/Link";
import HomeRoundedIcon from "@mui/icons-material/HomeRounded";
import Typography from "@mui/joy/Typography";
import React, { useEffect, useState, useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { fetchSubmissionDetails } from "../services/RankingsService";
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
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const { showSnackbar } = useSnackbar();

  const [searchParams, setSearchParams] = useSearchParams();
  const versionParam = searchParams.get("version");

  useEffect(() => {
    if (id) {
      const getSubmissionDetails = async () => {
        setLoading(true);
        const data = await fetchSubmissionDetails(id, versionParam);
        if (data.error) {
          setError(data.error);
          setLoading(false);
        } else {
          setSubmission(data);
          setError(null);
          setLoading(false);
        }
      };

      getSubmissionDetails();
    }
  }, [id, versionParam]);

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

  const handleVersionChange = (newVersion) => {
    setSearchParams({ version: newVersion });
  };

  const availableVersions = useMemo(() => {
    return submission?.availableVersions || [];
  }, [submission]);

  const cardStyle = {
    height: "100%",
    minHeight: "35vh",
    "&:hover": {
      borderColor: "primary.500",
    },
    overflow: "hidden",
  };

  return (
    <MainLayout>
      <Box sx={{ minHeight: "80vh" }}>
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <Box sx={{ p: 4, textAlign: "center" }}>
            <Typography color="danger" level="title-lg">
              {error}
            </Typography>
          </Box>
        ) : submission ? (
          <>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                paddingBottom: "16px",
              }}
            >
              <Breadcrumbs
                size="sm"
                aria-label="breadcrumbs"
                separator={<ChevronRightRoundedIcon fontSize="sm" />}
                sx={{ pl: 0 }}
              >
                <Link
                  underline="none"
                  color="neutral"
                  href="/"
                  aria-label="Home"
                >
                  <HomeRoundedIcon />
                </Link>
                <Link
                  underline="hover"
                  color="neutral"
                  href="/rankings"
                  sx={{ fontSize: 12, fontWeight: 500 }}
                >
                  Ranking
                </Link>
                <Typography
                  color="primary"
                  sx={{ fontWeight: 500, fontSize: 12 }}
                >
                  Detailed View
                </Typography>
              </Breadcrumbs>
              <Button
                size="sm"
                variant="outlined"
                color="neutral"
                startDecorator={copied ? <CheckIcon /> : <ContentCopyIcon />}
                onClick={handleShare}
                sx={{ borderRadius: "xl" }}
              >
                {copied ? "Link Copied!" : "Share Results?"}
              </Button>
            </Box>

            {/* Version Indicator Banner */}
            <Card
              variant="soft"
              color="primary"
              sx={{
                mb: 3,
                p: 1.5,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 2,
              }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center">
                <InfoOutlinedIcon color="primary" />
                <Box>
                  <Typography level="title-sm" fontWeight="bold">
                    Viewing Benchmark Protocol Snapshot: v{submission.version}
                  </Typography>
                  <Typography level="body-xs" color="text.secondary">
                    Scores and modules reflect the active benchmark suite for release v{submission.version}.
                  </Typography>
                </Box>
              </Stack>

              {availableVersions.length > 1 && (
                <Dropdown>
                  <MenuButton size="sm" variant="solid" color="primary">
                    Version: v{submission.version}
                  </MenuButton>
                  <Menu size="sm">
                    {availableVersions.map((v) => (
                      <MenuItem
                        key={v.version}
                        selected={v.version === submission.version}
                        onClick={() => handleVersionChange(v.version)}
                      >
                        <Box sx={{ display: "flex", flexDirection: "column" }}>
                          <Typography fontWeight="bold">v{v.version}</Typography>
                          <Typography level="body-xs" color="text.secondary">
                            Score: {v.score !== null ? Number(v.score).toFixed(2) : "N/A"}
                          </Typography>
                        </Box>
                      </MenuItem>
                    ))}
                  </Menu>
                </Dropdown>
              )}
            </Card>

            <Box>
              <Grid
                container
                spacing={3}
                sx={{ minHeight: "70vh", mb: 4 }}
              >
                <Grid item xs={6}>
                  <ModelCard
                    cardStyle={cardStyle}
                    submission={submission}
                  />
                </Grid>
                <Grid item xs={3}>
                  <UserCard
                    user={submission.user}
                    cardStyle={cardStyle}
                  />
                </Grid>
                <Grid item xs={3}>
                  <Card sx={cardStyle}>
                    <CardContent>
                      <Typography level="h2">Overall Score</Typography>
                      <CircularProgressCountUp
                        overallScore={submission.overallScore}
                      />
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={5}>
                  <ChartCard
                    cardStyle={cardStyle}
                    benchmarkScores={submission.benchmarkScores}
                    overallScore={submission.overallScore}
                  />
                </Grid>
                <Grid item xs={7}>
                  <Card sx={cardStyle}>
                    <BenchmarkingModulesOverview
                      benchmarkScores={submission.benchmarkScores}
                    />
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </>
        ) : null}
      </Box>
    </MainLayout>
  );
};

export default RankingDetailView;