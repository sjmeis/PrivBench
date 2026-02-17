import React, {useState, useRef} from "react";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Card from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
import AspectRatio from "@mui/joy/AspectRatio";
import {getGravatarUrl} from "../../utils/Gravatar";
import IconButton from "@mui/joy/IconButton";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FormLabel from "@mui/joy/FormLabel";
import FormControl from "@mui/joy/FormControl";
import Input from "@mui/joy/Input";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import Button from "@mui/joy/Button";
import CardOverflow from "@mui/joy/CardOverflow";
import CardActions from "@mui/joy/CardActions";
import { DeleteForever } from "@mui/icons-material";
import {updateUser, uploadProfilePicture, deleteProfilePicture} from "../../services/UserService";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import {useAuth} from "../../contexts/AuthContext";
import {Cancel, Save} from "@mui/icons-material";

const AccountSettings = ({user}) => {
    const [formData, setFormData] = useState({
        researchInstitute: user.researchInstitute,
        mailAddress: user.mailAddress,
    });

    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);  

    const { showSnackbar } = useSnackbar();
    const { checkAuth } = useAuth()

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            // Create a local URL for the preview
            const reader = new FileReader();
            reader.onloadend = () => setPreviewUrl(reader.result);
            reader.readAsDataURL(file);
        }
    };

    const handleDeletePicture = async () => {
        try {
            await deleteProfilePicture();
            showSnackbar("Profile picture removed", "success");
            setPreviewUrl(null); // Clear any local preview
            checkAuth(); // Refresh global user state
        } catch (error) {
            showSnackbar(error.message, "error");
        }
    };

    const updateUserInfo = async () => {
        try {
            if (selectedFile) {
                await uploadProfilePicture(selectedFile);
            }

            await updateUser({...formData, bio: user.bio});
            showSnackbar("User updated successfully", 'success')
            setSelectedFile(null); // Reset file state
            checkAuth()
        } catch (error) {
            showSnackbar(error.message, 'error')
        }
    };

    const isFormUntouched = () => {
        return formData.mailAddress === user.mailAddress && formData.researchInstitute === user.researchInstitute;
    }

    const isFormValid = () => {
        return (formData.mailAddress && !isFormUntouched()) || selectedFile !== null;
    };

    const resetForm = () => {
        setFormData({
            researchInstitute: user.researchInstitute,
            mailAddress: user.mailAddress,
        })
        setPreviewUrl(null);
        setSelectedFile(null);
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

    return (
        <Stack spacing={4} sx={{maxWidth: "800px", mx: "auto"}}>
            <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            style={{ display: "none" }}
            onChange={handleFileChange}
            />

            <Typography level="h4">Account Settings</Typography>
            <Box sx={{flex: 1, width: "100%"}}>
                <Stack
                    spacing={4}
                    sx={{
                        display: "flex",
                        maxWidth: "800px",
                        mx: "auto",
                        px: {xs: 2, md: 6},
                        py: {xs: 2, md: 3},
                    }}
                >
                    <Card>
                        <Box sx={{mb: 1}}>
                            <Typography level="title-md">Personal info</Typography>
                            <Typography level="body-sm">
                                Customize how your profile information will appear to other users.
                            </Typography>
                        </Box>
                        <Divider/>
                        <Stack
                            direction="row"
                            spacing={3}
                            sx={{my: 1}}
                        >
                            <Stack direction="column" spacing={1}>
                            <Box sx={{ position: "relative", width: "fit-content" }}>
                                <AspectRatio
                                    ratio="1"
                                    maxHeight={200}
                                    sx={{flex: 1, minWidth: 120, borderRadius: "100%"}}
                                >
                                    <img
                                        src={previewUrl || user.profilePicturePath || getGravatarUrl(user.mailAddress)}
                                        loading="lazy"
                                        alt="Profile"
                                    />
                                </AspectRatio>
                                <IconButton
                                    onClick={() => fileInputRef.current.click()} // Open file picker
                                    aria-label="Upload new profile picture"
                                    size="sm"
                                    variant="outlined"
                                    color="neutral"
                                    sx={{
                                        bgcolor: "background.body",
                                        position: "absolute",
                                        zIndex: 2,
                                        borderRadius: "50%",
                                        right: 0,
                                        bottom: 0,
                                        boxShadow: "sm",
                                    }}
                                >
                                    <EditRoundedIcon />
                                </IconButton>
                                {(user.profile_picture_path || previewUrl) && (
                                    <IconButton
                                        onClick={handleDeletePicture}
                                        size="sm"
                                        variant="outlined"
                                        color="danger"
                                        sx={{
                                            bgcolor: "background.body",
                                            position: "absolute",
                                            zIndex: 2,
                                            borderRadius: "50%",
                                            left: 15,
                                            bottom: 0,
                                            boxShadow: "sm",
                                        }}
                                    >
                                        <DeleteForever />
                                    </IconButton>
                                )}
                            </Box>
                            </Stack>
                            <Stack spacing={2} sx={{flexGrow: 1}}>
                                <Stack spacing={1}>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl
                                        disabled
                                    >
                                        <Input
                                            size="sm"
                                            value={user.username}
                                            name="username"
                                            onChange={handleChange}
                                        />
                                    </FormControl>
                                </Stack>
                                <Stack direction="row" spacing={2}>
                                    <FormControl sx={{flexGrow: 1}}>
                                        <FormLabel>Research Institute</FormLabel>
                                        <Input
                                            name="researchInstitute"
                                            size="sm"
                                            value={formData.researchInstitute}
                                            onChange={handleChange}
                                        />
                                    </FormControl>
                                    <FormControl sx={{flexGrow: 1}}>
                                        <FormLabel>Email</FormLabel>
                                        <Input
                                            size="sm"
                                            type="email"
                                            name="mailAddress"
                                            startDecorator={<EmailRoundedIcon/>}
                                            value={formData.mailAddress}
                                            onChange={handleChange}
                                        />
                                    </FormControl>
                                </Stack>
                            </Stack>
                        </Stack>
                        <CardOverflow sx={{borderTop: "1px solid", borderColor: "divider"}}>
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
        </Stack>
    );
};

export default AccountSettings;
