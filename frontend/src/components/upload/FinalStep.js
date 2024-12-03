import { useState, useEffect } from "react";
import { Typography, Card, CircularProgress } from "@mui/joy";

const FinalStep = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [averageScore, setAverageScore] = useState(null);

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
                    throw new Error(errorData.message || "Failed to run benchmark");
                }
        
                // Parse and handle the response
                const data = await response.json();
                setAverageScore(data.average_score);
            } catch (err) {
                // Handle error
                setError(err.message || "An error occurred");
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
            ) : error ? (
                <>
                    <Typography level="h2" mb={2} color="error">
                        Evaluation Failed
                    </Typography>
                    <Typography level="body1" color="error">
                        {error}
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
        </Card>
    );
};

export default FinalStep;

