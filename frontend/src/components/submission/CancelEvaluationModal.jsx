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
