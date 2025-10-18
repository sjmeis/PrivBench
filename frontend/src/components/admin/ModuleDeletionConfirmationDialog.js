import React, { useState } from "react";
import {
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
  CircularProgress,
} from "@mui/joy";
import { Cancel, InfoOutlined } from "@mui/icons-material";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";

const ModuleDeletionConfirmationDialog = ({
  isOpen,
  handleClose,
  handleDelete,
  moduleName,
  isLoading = false,
}) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const isConfirmEnabled = inputValue === moduleName;

  return (
    <Modal open={isOpen} onClose={handleClose}>
      <ModalDialog sx={{ maxWidth: "440px" }}>
        <DialogTitle>Confirm Module Deletion</DialogTitle>
        <Divider sx={{ marginBottom: "10px" }}></Divider>
        <DialogContent>
          <Stack spacing={2}>
            <Typography
              sx={{ maxWidth: "400px", p: 1 }}
              startDecorator={<InfoOutlined />}
              variant="soft"
              color="danger"
              level="body1"
            >
              Warning: Deleting this module will remove all associated benchmark
              scores and update the overall scores for submissions.
            </Typography>
            <Typography>
              Please type the module name <strong>{moduleName}</strong> to
              confirm deletion.
            </Typography>
            <Input
              fullWidth
              placeholder="Enter module name"
              value={inputValue}
              onChange={handleInputChange}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ marginTop: "10px" }}>
          <Button
            color="danger"
            onClick={handleDelete}
            disabled={!isConfirmEnabled || isLoading}
            endDecorator={
              isLoading ? <CircularProgress size="sm" /> : <DeleteForeverIcon />
            }
          >
            {isLoading ? "Deleting..." : "Confirm & Delete"}
          </Button>
          <Button
            color="neutral"
            onClick={handleClose}
            startDecorator={<Cancel />}
          >
            Cancel
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
};

export default ModuleDeletionConfirmationDialog;
