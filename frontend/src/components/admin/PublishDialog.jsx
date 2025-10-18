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
} from "@mui/joy";
import { Save } from "@mui/icons-material";
import { ModuleService } from "../../services/ModuleService";
import { useSnackbar } from "../../contexts/SnackbarProvider";

const compareVersions = (a, b) => {
  if (!a || !b) return null;
  const pa = a
    .trim()
    .split(".")
    .map((n) => Number(n));
  const pb = b
    .trim()
    .split(".")
    .map((n) => Number(n));
  if (pa.length !== 3 || pb.length !== 3 || pa.some(isNaN) || pb.some(isNaN))
    return null;
  for (let i = 0; i < 3; i++) {
    if (pa[i] > pb[i]) return 1;
    if (pa[i] < pb[i]) return -1;
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
        description.trim()
      );
      const requiresUpdate = !!result?.requiresSubmissionUpdate;
      showSnackbar(
        requiresUpdate
          ? "Published. Users need to update submissions (new module added)."
          : "Published. No user submission updates required.",
        "success"
      );
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
              placeholder="Optional: describe this release"
              minRows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
                      [{u.update_type}] {u.module_name} —{" "}
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
