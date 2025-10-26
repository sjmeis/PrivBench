import * as React from "react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateSubmissionVisibility } from "../../services/RankingsService";
import * as rankingService from "../../services/RankingsService";
import {
  Stack,
  Box,
  Card,
  Divider,
  Typography,
  Button,
  Sheet,
  Table,
  CardOverflow,
  CardActions,
  Dropdown,
  MenuButton,
  Menu,
  MenuItem,
  Tooltip,
} from "@mui/joy";
import UserSubmissionsTableRow from "./UserSubmissionsTableRow";
import UpdateSubmissionModal from "./UpdateSubmissionModal";
import { useSnackbar } from "../../contexts/SnackbarProvider";
import { SubmissionStatus } from "../../enums/SubmissionStatus";
import { API_BASE_URL } from "../../config";

const UserSubmissions = () => {
  const [submissions, setSubmissions] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [pendingSubmission, setPendingSubmission] = useState(null);
  const [inProgressSubmission, setInProgressSubmission] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submission, setSubmission] = useState(null);
  const { showSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const fetchSubmissionsAndTemplates = async () => {
    try {
      // Fetch submissions
      const submissionData = await rankingService.getUserSubmissions();
      setSubmissions(submissionData.submissions);

      const pending = submissionData.submissions.find(
        (s) => s.status === SubmissionStatus.PENDING
      );
      const inProgress = submissionData.submissions.find(
        (s) => s.status === SubmissionStatus.IN_PROGRESS
      );
      setPendingSubmission(pending);
      setInProgressSubmission(inProgress);

      // Fetch templates
      const templateResponse = await fetch(
        `${API_BASE_URL}/metadata/templates`,
        { credentials: "include" }
      );
      if (templateResponse.ok) {
        const templateData = await templateResponse.json();
        setTemplates(templateData);
      } else {
        console.error("Failed to fetch templates");
      }
    } catch (err) {
      showSnackbar(err.message || "Failed to fetch data");
    }
  };

  useEffect(() => {
    fetchSubmissionsAndTemplates();
  }, []);

  const onTogglePublic = async (submissionId, newVisibility) => {
    try {
      await updateSubmissionVisibility(submissionId, newVisibility);
      fetchSubmissionsAndTemplates();
    } catch (error) {
      console.error("Failed to update submission visibility:", error);
    }
  };

  const onUpdateSubmissionClick = (submission) => {
    setSubmission(submission);
    setIsModalOpen(true);
  };

  const onClose = () => {
    fetchSubmissionsAndTemplates();
    setIsModalOpen(false);
    setSubmission(null);
  };

  const handleNewOrContinueSubmission = () => {
    if (pendingSubmission) {
      // Navigate to continue the pending submission
      navigate("/upload", {
        state: {
          currentStep: 1,
          submissionId: pendingSubmission.id,
          metadata: pendingSubmission.metadata,
        },
      });
    } else {
      // Navigate to start a new submission
      navigate("/upload");
    }
  };

  const handleStartFromTemplate = (template) => {
    const { id, templateName, ...metadata } = template;
    navigate("/upload", {
      state: {
        currentStep: 1,
        metadata: metadata,
        templateId: id,
      },
    });
  };

  const hasActiveSubmission = !!pendingSubmission || !!inProgressSubmission;

  const getTooltipTitle = () => {
    if (inProgressSubmission)
      return "A submission is processing. Please wait until it is complete.";
    if (pendingSubmission)
      return "You must complete your pending submission before starting a new one.";
    if (templates.length === 0)
      return "You have no saved templates. You can create one during the submission process.";
    return "";
  };

  return (
    <>
      <Stack spacing={4} sx={{ maxWidth: "1100px", mx: "auto" }}>
        <Typography level="h4">Submissions</Typography>
        <Box sx={{ flex: 1, width: "100%" }}>
          <Stack
            spacing={4}
            sx={{
              display: "flex",
              mx: "auto",
              px: { xs: 2, md: 6 },
              py: { xs: 2, md: 3 },
            }}
          >
            <Card>
              <Box sx={{ mb: 1 }}>
                <Typography level="title-md">
                  Overview of submissions
                </Typography>
                <Typography level="body-sm">
                  Make Submission Public to visualize them on the leaderboard
                  and earn badges
                </Typography>
              </Box>
              <Divider />

              {submissions.length > 0 ? (
                <Sheet>
                  <Table
                    aria-label="collapsible submissions table"
                    sx={{
                      "& > thead > tr > th:nth-child(n + 3), & > tbody > tr > td:nth-child(n + 3)":
                        {
                          textAlign: "left",
                        },
                    }}
                  >
                    <thead>
                      <tr>
                        <th style={{ width: 5 }} aria-label="empty" />
                        <th style={{ width: 20 }}>Name</th>
                        <th style={{ width: 20 }}>Timestamp</th>
                        <th style={{ width: 20 }}>Status</th>
                        <th style={{ width: 20 }}>Score</th>
                        <th style={{ width: 10 }}>Version</th>
                        <th style={{ width: 15 }} align="center">
                          Public
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {submissions.map((submission) => (
                        <UserSubmissionsTableRow
                          key={submission.id}
                          row={submission}
                          onUpdateSubmission={onUpdateSubmissionClick}
                          onTogglePublic={onTogglePublic}
                        />
                      ))}
                    </tbody>
                  </Table>
                </Sheet>
              ) : (
                <Box sx={{ p: 3, textAlign: "center" }}>
                  <Typography level="body-md">
                    You have no submissions yet. Start a new one below!
                  </Typography>
                </Box>
              )}

              <CardOverflow
                sx={{ borderTop: "1px solid", borderColor: "divider" }}
              >
                <CardActions sx={{ alignSelf: "flex-end", pt: 2, gap: 1 }}>
                  <Tooltip
                    title={getTooltipTitle()}
                    variant="outlined"
                    arrow
                    placement="top"
                    disableHoverListener={
                      templates.length > 0 && !hasActiveSubmission
                    }
                  >
                    {/* This Box acts as a wrapper for the Tooltip to work on a disabled element */}
                    <Box sx={{ display: "inline-block" }}>
                      <Dropdown>
                        <MenuButton
                          size="sm"
                          variant="soft"
                          color="primary"
                          disabled={
                            templates.length === 0 || hasActiveSubmission
                          }
                          sx={{ width: 160 }}
                        >
                          New from Template
                        </MenuButton>
                        <Menu size="sm" sx={{ width: 160 }}>
                          {templates.map((template) => (
                            <MenuItem
                              key={template.id}
                              onClick={() => handleStartFromTemplate(template)}
                            >
                              {template.templateName}
                            </MenuItem>
                          ))}
                        </Menu>
                      </Dropdown>
                    </Box>
                  </Tooltip>
                  <Button
                    onClick={handleNewOrContinueSubmission}
                    size="sm"
                    color="success"
                    variant="soft"
                    sx={{ minWidth: 160 }}
                    disabled={!!inProgressSubmission && !pendingSubmission}
                  >
                    {pendingSubmission
                      ? "Continue Submission"
                      : "New Submission"}
                  </Button>
                </CardActions>
              </CardOverflow>
            </Card>
          </Stack>
        </Box>
      </Stack>
      <UpdateSubmissionModal
        isOpen={isModalOpen}
        submission={submission}
        onClose={onClose}
      />
    </>
  );
};

export default UserSubmissions;
