import { useState, useEffect } from "react";
import { Typography, Card, CircularProgress, Box, Button } from "@mui/joy";
import { useNavigate } from "react-router-dom";
import CustomSnackbar from "../shared/CustomSnackbar";
import {RemoveRedEye} from "@mui/icons-material";

const FinalStep = () => {
    const [loading, setLoading] = useState(true);
    const [averageScore, setAverageScore] = useState(null);
    const [moduleScores, setModuleScores] = useState([]);
    const [openSnackbar, setOpenSnackbar] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState("");
    const [snackbarSeverity, setSnackbarSeverity] = useState("info");
    const navigate = useNavigate();  // Added useNavigate hook

    useEffect(() => {
        const runBenchmark = async () => {
            try {
                setLoading(true);

                const endpoint = "http://localhost:5000/run-benchmark";

                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    credentials: "include",
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    setSnackbarMessage(errorData.message || "Failed to run benchmark!");
                    setSnackbarSeverity("error");
                    setOpenSnackbar(true);
                    return;
                }

                const data = await response.json();
                setAverageScore(data.average_score);
                setModuleScores(data.module_scores);

                setSnackbarMessage("Benchmark completed successfully!");
                setSnackbarSeverity("success");
                setOpenSnackbar(true);
            } catch (err) {
                setSnackbarMessage(err.message || "An unexpected error occurred!");
                setSnackbarSeverity("error");
                setOpenSnackbar(true);
            } finally {
                setLoading(false);
            }
        };

        runBenchmark();
    }, []);

    // Handle the button click to navigate to 'submissions'
    const handleViewSubmissions = () => {
        navigate("/profile", { state: "submissions" });
    };

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

                    <Card variant="outlined" sx={{ p: 3, textAlign: "center" }}>
                        <Typography level="h3" mb={3} sx={{ textAlign: "center", fontWeight: "bold" }}>
                            Evaluation Summary
                        </Typography>
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, textAlign: "left" }}>
                            {/* Display Average Score */}
                            <Card
                                variant="soft"
                                sx={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    p: 2
                                }}
                            >
                                <Typography level="body1" sx={{ fontWeight: "bold" }}>
                                    Average Score
                                </Typography>
                                <Typography level="body1" color="success">
                                    {averageScore}
                                </Typography>
                            </Card>

                            {/* Display Module Scores */}
                            {moduleScores.map((module, index) => (
                                <Card
                                    key={index}
                                    variant="soft"
                                    sx={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                        p: 2,
                                        borderColor: "#e0e0e0",
                                    }}
                                >
                                    <Typography level="body1" sx={{ fontWeight: "bold" }}>
                                        {module.module_name} Score
                                    </Typography>
                                    <Typography level="body1" color="primary">
                                        {module.score}
                                    </Typography>
                                </Card>
                            ))}
                        </Box>
                    </Card>

                    {/* View my submissions Button */}
                    <Button
                        variant="solid"
                        color="primary"
                        sx={{ mt: 3 }}
                        onClick={handleViewSubmissions}
                        endDecorator={<RemoveRedEye />}
                    >
                        View My Submissions
                    </Button>
                </>
            )}

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





