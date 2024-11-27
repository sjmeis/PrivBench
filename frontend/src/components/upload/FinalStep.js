import { Typography, Card } from "@mui/joy";

const FinalStep = () => {
    return (
        <Card variant="outlined" sx={{ width: "100%", maxWidth: 800, mx: "auto", textAlign: "center", p: 3 }}>
            <Typography level="h2" mb={2}>
                Evaluation in Progress
            </Typography>
            <Typography level="body1">
                Your submission is being evaluated. You will be notified once the benchmarking process is completed.
            </Typography>
        </Card>
    );
};

export default FinalStep;
