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

import React, { useState, useEffect } from "react";
import {
  Button,
  DialogTitle,
  DialogContent,
  DialogActions,
  Modal,
  ModalDialog,
  Input,
  Stack,
} from "@mui/joy";

const MetadataTemplateDialog = ({
  open,
  onClose,
  onConfirm,
  title = "Save as Template",
  description = "Please enter a name for your metadata template. You can use this template to quickly fill out the metadata form in future submissions.",
  confirmText = "Save",
  initialValue = "",
}) => {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    if (open) {
      setName(initialValue);
    }
  }, [open, initialValue]);

  const handleConfirm = () => {
    if (name.trim()) {
      onConfirm(name.trim());
      onClose();
    }
  };

  return (
    <Modal open={open} onClose={onClose}>
      <ModalDialog>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>{description}</DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleConfirm()}
            placeholder="Enter template name"
          />
        </Stack>
        <DialogActions>
          <Button onClick={onClose} variant="plain" color="neutral">
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!name.trim()}
            variant="solid"
            color="primary"
          >
            {confirmText}
          </Button>
        </DialogActions>
      </ModalDialog>
    </Modal>
  );
};

export default MetadataTemplateDialog;
