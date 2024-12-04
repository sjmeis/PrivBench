import Stack from "@mui/joy/Stack";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import * as React from "react";
import Divider from "@mui/joy/Divider";
import Textarea from "@mui/joy/Textarea";
import FormHelperText from "@mui/joy/FormHelperText";
import CardOverflow from "@mui/joy/CardOverflow";
import CardActions from "@mui/joy/CardActions";
import Button from "@mui/joy/Button";
import Card from "@mui/joy/Card";

const PublicProfileEdit = () => {


    return (<Stack spacing={4} sx={{maxWidth: '800px', mx: 'auto'}}>
        <Typography level="h4">Edit Public Profile</Typography>
        <Box sx={{flex: 1, width: '100%'}}>
            <Stack
                spacing={4}
                sx={{
                    display: 'flex',
                    maxWidth: '800px',
                    mx: 'auto',
                    px: {xs: 2, md: 6},
                    py: {xs: 2, md: 3},
                }}
            >
                <Card>
                    <Box sx={{ mb: 1 }}>
                        <Typography level="title-md">Bio</Typography>
                        <Typography level="body-sm">
                            Write a short introduction to be displayed on your profile
                        </Typography>
                    </Box>
                    <Divider />
                    <Stack spacing={2} sx={{ my: 1 }}>
                        <Textarea
                            size="sm"
                            minRows={4}
                            sx={{ mt: 1.5 }}
                            defaultValue="I'm a software developer based in Bangkok, Thailand. My goal is to solve UI problems with neat CSS without using too much JavaScript."
                        />
                        <FormHelperText sx={{ mt: 0.75, fontSize: 'xs' }}>
                            275 characters left
                        </FormHelperText>
                    </Stack>
                    <CardOverflow sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <CardActions sx={{ alignSelf: 'flex-end', pt: 2 }}>
                            <Button size="sm" variant="outlined" color="neutral" disabled>
                                Cancel
                            </Button>
                            <Button size="sm" variant="solid" disabled>
                                Save
                            </Button>
                        </CardActions>
                    </CardOverflow>
                </Card>


            </Stack>
        </Box>
    </Stack>)
}

export default PublicProfileEdit;