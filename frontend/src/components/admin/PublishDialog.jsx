import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Input,
  Modal,
  ModalDialog,
  Stack,
  Typography,
  Textarea,
  Checkbox,
} from "@mui/joy";
import { Save } from "@mui/icons-material";
import { ModuleService } from "../../services/ModuleService";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const compareVersions = (versionA, versionB) => {
  if (!versionA || !versionB) return null;
  const segmentsA = versionA
    .trim()
    .split(".")
    .map((n) => Number(n));
  const segmentsB = versionB
    .trim()
    .split(".")
    .map((n) => Number(n));
  const isValid =
    segmentsA.length === 3 &&
    segmentsB.length === 3 &&
    !segmentsA.some(Number.isNaN) &&
    !segmentsB.some(Number.isNaN);
  if (!isValid) return null;
  for (let i = 0; i < 3; i++) {
    if (segmentsA[i] > segmentsB[i]) return 1;
    if (segmentsA[i] < segmentsB[i]) return -1;
  }
  return 0;
};

const PublishDialog = ({ open, onClose, onPublished }) => {
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState([]);
  const [currentVersion, setCurrentVersion] = useState("");
  const [recommended, setRecommended] = useState("");
  const [version, setVersion] = useState("");
  const [versionError, setVersionError] = useState("");
  const [description, setDescription] = useState("");
  const [sendEmail, setSendEmail] = useState(true);
  const [hasMajorChanges, setHasMajorChanges] = useState(false);
  const { showSnackbar } = useSnackbar();

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const data = await ModuleService.fetchPendingModuleUpdates();
        setPending(data.pending || []);
        setCurrentVersion(data.currentVersion || "");
        setRecommended(data.recommendedNext || "");
        setHasMajorChanges(data.hasMajorChanges || false);
        const next = data.recommendedNext || "";
        setVersion(next);
        if (next && data.currentVersion) {
          const cmp = compareVersions(next, data.currentVersion);
          setVersionError(
            cmp === 1 ? "" : "Version must be greater than current version"
          );
        } else {
          setVersionError("");
        }

        // Prefill description with changes-to-publish summary if user hasn't typed anything
        if (!description) {
          const pendingList = (data.pending || [])
            .map(
              (update) =>
                `- ${update.module_name}${
                  update.description ? ` — ${update.description}` : ""
                }`
            )
            .join("\n");
          const changesHeader =
            pendingList.length > 0
              ? `Changes to publish:\n${pendingList}\n\n`
              : "";
          setDescription(changesHeader);
        }
      } catch (e) {
        showSnackbar(e.message || "Failed to load pending updates", "error");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, showSnackbar]);

  const onChangeVersion = (val) => {
    setVersion(val);
    if (!val?.trim() || !currentVersion) {
      setVersionError("Version is required");
      return;
    }
    const cmp = compareVersions(val.trim(), currentVersion);
    if (cmp === null) {
      setVersionError("Use semantic versioning (e.g., 1.2.3)");
    } else if (cmp <= 0) {
      setVersionError("Version must be greater than current version");
    } else {
      setVersionError("");
    }
  };

  const onPublish = async () => {
    if (!version.trim()) {
      showSnackbar("Version is required", "warning");
      return;
    }
    // block publish when invalid or smaller/equal
    if (versionError) {
      showSnackbar(versionError, "warning");
      return;
    }
    try {
      setLoading(true);
      const result = await ModuleService.publishModuleUpdates(
        version.trim(),
        description.trim(),
        sendEmail
      );
      const requiresUpdate = !!result?.requiresSubmissionUpdate;
      let message = "Published successfully.";
      if (requiresUpdate) {
        message = sendEmail
          ? "Published. Users will be notified via email about new modules."
          : "Published. Users need to update submissions (new modules added). No emails sent.";
      } else {
        message = "Published. No user submission updates required.";
      }

      showSnackbar(message, "success");
      onPublished?.();
      onClose();
    } catch (e) {
      showSnackbar(e.response?.data?.message || e.message, "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog sx={{ width: 700, maxWidth: "90vw" }}>
        <DialogTitle>Publish Version</DialogTitle>
        <Divider />
        <DialogContent>
          <Stack spacing={2}>
            <Typography level="body-sm">
              Current version: <b>{currentVersion || "N/A"}</b> — Recommended
              next: <b>{recommended || "-"}</b>
            </Typography>
            <Input
              value={version}
              onChange={(e) => onChangeVersion(e.target.value)}
              placeholder="Enter version (e.g., 1.0.3)"
              color={versionError ? "danger" : "neutral"}
            />
            {versionError && (
              <Typography level="body-xs" color="danger">
                {versionError}
              </Typography>
            )}
            <Textarea
              placeholder="Optional: describe this release (Detected changes prefilled based on pending updates)"
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            {/* Add checkbox for email notification */}
            {hasMajorChanges && (
              <Box
                sx={{
                  p: 1.5,
                  bgcolor: "background.level1",
                  borderRadius: "sm",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Checkbox
                  label="Send email notifications to users about outdated submissions"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <Typography level="body-xs" sx={{ ml: 3.5, mt: 0.5 }}>
                  {sendEmail
                    ? "Users will receive an email notification about new modules requiring submission updates."
                    : "No email notifications will be sent. Users will only see updates on the platform."}
                </Typography>
              </Box>
            )}

            <Box
              sx={{
                border: "1px solid #eee",
                borderRadius: 8,
                p: 1,
                maxHeight: 260,
                overflowY: "auto",
              }}
            >
              <Typography level="title-sm">Changes to publish</Typography>
              {pending.length === 0 ? (
                <Typography level="body-sm">No pending updates.</Typography>
              ) : (
                pending.map((u) => (
                  <Box
                    key={u.id}
                    sx={{ p: 1, borderBottom: "1px solid #f2f2f2" }}
                  >
                    <Typography level="body-sm">
                      [{u.update_type}] [{u.change_level}] {u.module_name} —{" "}
                      {u.description || "No details"}
                    </Typography>
                  </Box>
                ))
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button variant="soft" onClick={onClose}>
            Close
          </Button>
          <Button
            loading={loading}
            color="success"
            endDecorator={<Save />}
            onClick={onPublish}
            disabled={!!versionError || !version.trim()}
          >
            Publish
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
};

export default PublishDialog;
