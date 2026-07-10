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

import { Box, Button, Modal, Typography } from "@mui/joy";

const CancelEvaluationModal = ({ isOpen, onClose, handleCancel }) => {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      <Box
        sx={{
          width: 400,
          p: 3,
          bgcolor: "white",
          borderRadius: 2,
        }}
      >
        <Typography level="h2" mb={2} color="neutral" sx={{ color: "black" }}>
          Cancel Evaluation
        </Typography>
        <Typography mb={3} sx={{ color: "black" }}>
          Are you sure you want to cancel the evaluation? This action cannot be
          undone.
        </Typography>
        <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={onClose}
            sx={{ mr: 1, color: "black" }}
          >
            Cancel
          </Button>
          <Button variant="solid" color="danger" onClick={handleCancel}>
            Confirm Cancellation
          </Button>
        </Box>
      </Box>
    </Modal>
  );
};

export default CancelEvaluationModal;
