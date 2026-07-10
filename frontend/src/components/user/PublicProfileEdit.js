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
import {useState} from "react";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import {useAuth} from "../../contexts/AuthContext";
import {updateUser} from "../../services/UserService";
import {Save, Cancel} from "@mui/icons-material";

const PublicProfileEdit = ({user}) => {
    const [formData, setFormData] = useState({
        bio: user.bio,
    });

    const { showSnackbar } = useSnackbar();
    const { checkAuth } = useAuth()

    const updateUserInfo = async () => {
        try {
            await updateUser({ bio: formData.bio });
            showSnackbar("Bio updated successfully!", 'success');
            checkAuth();
        } catch (error) {
            showSnackbar(error.message, 'error');
        }
    };

    const isFormUntouched = () => {
        return formData.bio === user.bio;
    }

    const isFormValid = () => {
        return formData.bio && !isFormUntouched();
    }

    const resetForm = () => {
        setFormData({
            bio: user.bio
        })
    }


    const handleChange = (e) => {
        const {name, value} = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [name]: value,
        }));
    };

    const handleSaveClick = () => {
        updateUserInfo()
    }

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
                            Write a short introduction to be displayed on your profile.
                        </Typography>
                    </Box>
                    <Divider />
                    <Stack spacing={2} sx={{ my: 1 }}>
                        <Textarea
                            size='sm'
                            minRows={4}
                            maxRows={10}
                            sx={{ mt: 1.5 }}
                            onChange={handleChange}
                            name='bio'
                            value={formData.bio}
                            maxLength={400}
                            placeholder="Write your bio here..."
                        />
                        <FormHelperText sx={{ mt: 0.75, fontSize: 'xs' }}>
                            {400 - formData.bio.length} characters remaining
                        </FormHelperText>
                    </Stack>
                    <CardOverflow sx={{ borderTop: '1px solid', borderColor: 'divider' }}>
                        <CardActions sx={{alignSelf: "flex-end", pt: 2}}>
                            <Button onClick={resetForm} disabled={isFormUntouched()} size="sm" variant="outlined" color="neutral" startDecorator={<Cancel />}>
                                Cancel
                            </Button>
                            <Button disabled={!isFormValid()} size="sm" variant="solid" onClick={handleSaveClick} endDecorator={<Save />}>
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