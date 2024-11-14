import {Box, Button, Card, Grid, Typography} from "@mui/joy";
import { useNavigate } from "react-router-dom";
import {Info, Timeline} from "@mui/icons-material";


const Home = () => {
    const navigate = useNavigate(); //used to navigate to other pages

    return(
        <Box
            sx={{
                display: 'flex', // Use flexbox for centering the content
                justifyContent: 'center', // Horizontally center content
                alignItems: 'center', // Vertically center content
                flexDirection: 'column', // Stack elements vertically
                height: '100%', // Take up full height of the viewport
                padding: 2, // Add padding around the container
                paddingTop: 0 // Remove padding on top
            }}
        >
            {/* Main grid container for the 2 boxes */}
            <Grid container spacing={5} justifyContent="center" alignItems="center" sx={{ paddingTop: '50px', maxWidth: '90vw' }}>
                {/* left box */}
                <Grid item xs={12} md={6}>
                    <Card
                        sx={{
                            backgroundColor: 'secondary.main', // Set background color based on theme
                            height: '66vh', // Set fixed height to 66% of the viewport height
                            width: '600px', // Set fixed width of the box
                            display: 'flex', // Use flexbox to center content inside the Paper
                            alignItems: 'center', // Vertically center the content
                            justifyContent: 'center', // Horizontally center the content
                            padding: 4, // Padding around the content
                            paddingBottom: 0 // Remove bottom padding
                        }}
                    >
                        <Typography
                            level="h3" // Text size
                            sx={{
                                color: 'primary.textPrimary', // Text color based on theme
                                textAlign: 'center', // Center the text horizontally
                            }}
                        >
                            Graph goes here
                        </Typography>
                    </Card>
                </Grid>

                {/* Right Box - Content Section */}
                <Grid item xs={12} md={6}>
                    <Card
                        sx={{
                            backgroundColor: 'secondary.main', // Set background color based on theme
                            height: '66vh', // Set fixed height to 66% of the viewport height
                            width: '600px', // Set fixed width of the box
                            display: 'flex', // Use flexbox for layout
                            flexDirection: 'column', // Stack items vertically in this box
                            justifyContent: 'center', // Vertically center the content in the right box
                            padding: 4, // Padding around the content
                            paddingBottom: 0 // Remove bottom padding
                        }}
                    >
                        {/* Text Content in the Right Box */}
                        <Box>
                            <Typography level="h3" align="center" sx={{ color: 'primary.textPrimary' }}>
                                Right Side Content
                            </Typography>
                            <Typography
                                variant="body1" // Set the text size to body1
                                mt={2} // Add margin-top of 2 units to the text
                                sx={{
                                    color: 'primary.textPrimary', // Text color based on theme
                                    wordWrap: 'break-word', // Ensure text wraps if it exceeds the container width
                                    whiteSpace: 'normal', // Allow text to wrap normally
                                }}
                            >
                                This is some text describing who we are, what we are doing and what the platform is all
                                about. If the text exceeds the width of the box, it will wrap into multiple lines.
                            </Typography>
                        </Box>

                        {/* Buttons at the Bottom of the Right Box */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, marginTop: '300px' }}>
                            {/* Rankings Button */}
                            <Button
                                variant="soft"
                                startDecorator={<Timeline />} // Add icon
                                onClick={() => navigate("/rankings")} // Navigate to the rankings page
                                sx={{
                                    width: '40%', // Set button width to 40% of the container width
                                    marginLeft: '10px',
                                }}
                            >
                                Rankings
                            </Button>
                            {/* How does it work? Button */}
                            <Button
                                variant="soft"
                                startIcon={<Info />} // Add Info icon
                                onClick={() => navigate("/information")} // Navigate to the information page
                                sx={{
                                    width: '40%', // Set button width to 40% of the container width
                                    marginRight: '10px', // Add right margin between buttons
                                }}
                            >
                                How does it work?
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

export default Home;