import { useState, useEffect } from "react";
import { Typography, Card, CircularProgress } from "@mui/joy";
import CustomSnackbar from "../shared/CustomSnackbar";

const FinalStep = () => {
    const [loading, setLoading] = useState(true);
    const [averageScore, setAverageScore] = useState(null);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");

    useEffect(() => {
        const runBenchmark = async () => {
            try {
                // Set the loading state
                setLoading(true);

                const endpoint = "http://localhost:5000/run-benchmark";

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });

                // Check for HTTP errors
                if (!response.ok) {
                    const errorData = await response.json();
                    setSnackbarMessage(errorData.message || "Failed to run benchmark!");
                    setSnackbarSeverity("error");
                    setOpenSnackbar(true);
                    return; // Stop further execution on error
                }

                // Parse and handle the response
                const data = await response.json();
                setAverageScore(data.average_score);

                // Show success snackbar
                setSnackbarMessage("Benchmark completed successfully!");
                setSnackbarSeverity("success");
                setOpenSnackbar(true);
            } catch (err) {
                // Handle error by showing message in Snackbar
                setSnackbarMessage(err.message || "An unexpected error occurred!");
                setSnackbarSeverity("error");
                setOpenSnackbar(true);
            } finally {
                // Stop the loading state
                setLoading(false);
            }
        };

        runBenchmark();
    }, []);

    return (
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 800, mx: "auto", textAlign: "center", p: 3 }}>
            {loading ? (
                <>
                    <Typography level="h2" mb={2}>
                        Evaluation in Progress
                    </Typography>
                    <CircularProgress />
                </>
            ) : snackbarSeverity === "error" ? (
                <>
                    <Typography level="h2" mb={2} color="error">
                        Evaluation Failed
                    </Typography>
                    <Typography level="body1" color="error">
                        {snackbarMessage}
                    </Typography>
                </>
            ) : (
                <>
                    <Typography level="h2" mb={2}>
                        Evaluation Completed
                    </Typography>
                    <Typography level="body1">
                        Your submission was successfully evaluated. Average Score: <strong>{averageScore}</strong>
                    </Typography>
                </>
            )}

            {/* Snackbar for error or success message */}
            <CustomSnackbar
                open={openSnackbar}
                message={snackbarMessage}
                severity={snackbarSeverity}
                onClose={() => setOpenSnackbar(false)}
            />
        </Card>
    );
};

export default FinalStep;




