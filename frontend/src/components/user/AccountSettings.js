import React, {useState, useRef} from "react";
import Typography from "@mui/joy/Typography";
import Box from "@mui/joy/Box";
import Stack from "@mui/joy/Stack";
import Card from "@mui/joy/Card";
import Divider from "@mui/joy/Divider";
import Modal from "@mui/joy/Modal";
import ModalDialog from "@mui/joy/ModalDialog";
import ModalClose from "@mui/joy/ModalClose";
import AspectRatio from "@mui/joy/AspectRatio";
import {getGravatarUrl} from "../../utils/Gravatar";
import IconButton from "@mui/joy/IconButton";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import WarningRounded from "@mui/icons-material/WarningRounded";
import FormLabel from "@mui/joy/FormLabel";
import FormControl from "@mui/joy/FormControl";
import Input from "@mui/joy/Input";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import Button from "@mui/joy/Button";
import CardOverflow from "@mui/joy/CardOverflow";
import CardActions from "@mui/joy/CardActions";
import { DeleteForever } from "@mui/icons-material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import ToggleButton from '@mui/material/ToggleButton';
import { FormHelperText } from '@mui/joy';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

import {updateUser, uploadProfilePicture, deleteProfilePicture, changePassword} from "../../services/UserService";
import {useSnackbar} from "../../contexts/SnackbarProvider";
import {useAuth} from "../../contexts/AuthContext";
import {Cancel, Save, LockRounded} from "@mui/icons-material";

const AccountSettings = ({user}) => {
    const [formData, setFormData] = useState({
        researchInstitute: user.researchInstitute,
        mailAddress: user.mailAddress,
        isEmailPublic: user.isEmailPublic ?? false
    });

    const [previewUrl, setPreviewUrl] = useState(null);
    const [selectedFile, setSelectedFile] = useState(null);
    const fileInputRef = useRef(null);  

    const { showSnackbar } = useSnackbar();
    const { checkAuth, logout } = useAuth()

    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [confirmText, setConfirmText] = useState("");

    const [passwords, setPasswords] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
    });
    const [showPasswords, setShowPasswords] = useState(false);
    const [isPasswordLoading, setIsPasswordLoading] = useState(false);

    const closeDeleteModal = () => {
        setIsDeleteModalOpen(false);
        setConfirmText("");
    };

    const handleDeleteAccount = async () => {
        setIsDeleting(true);
        try {
            await axios.delete(`${API_BASE_URL}/user/delete-account`);
            showSnackbar("Your account has been permanently deleted.", "success");
            logout();
        } catch (error) {
            showSnackbar("Failed to delete account. Please try again.", "error");
            setIsDeleting(false);
            closeDeleteModal();
        }
    };

    const handlePasswordChange = (e) => {
        setPasswords({ ...passwords, [e.target.name]: e.target.value });
    };

    const isNewPasswordSecure = (pwd) => /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(pwd);

    const updatePassword = async () => {
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;

        const trimmedNewPassword = passwords.newPassword.trim();
        const trimmedCurrentPassword = passwords.currentPassword.trim();
        const trimmedConfirmPassword = passwords.confirmPassword.trim();
        
        if (!passwordRegex.test(trimmedNewPassword)) {
            showSnackbar("Password must be at least 8 characters long and include both letters and numbers.", "error");
            return;
        }

        if (trimmedNewPassword !== trimmedConfirmPassword) {
            showSnackbar("New passwords do not match", "error");
            return;
        }

        setIsPasswordLoading(true);

        try {
            await changePassword(trimmedCurrentPassword, trimmedNewPassword);
            showSnackbar("Password updated. You will be logged out for security.", "success");
            
            setTimeout(() => {
                logout();
            }, 2000);
            
        } catch (error) {
            setIsPasswordLoading(false);
            if (error.response?.status === 429) {
                showSnackbar("Too many attempts. Please wait a minute before trying again.", "error");
            } else {
                showSnackbar(error.message, "error");
            }
        }
    };

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
        return formData.mailAddress === user.mailAddress && formData.researchInstitute === user.researchInstitute && formData.isEmailPublic === (user.isEmailPublic ?? false);
    }

    const isFormValid = () => {
        return (formData.mailAddress && !isFormUntouched()) || selectedFile !== null;
    };

    const resetForm = () => {
        setFormData({
            researchInstitute: user.researchInstitute,
            mailAddress: user.mailAddress,
            isEmailPublic: user.isEmailPublic ?? false
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
                                {(user.profilePicturePath || previewUrl) && (
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
                                <Stack spacing={1}>
                                    <FormControl sx={{flexGrow: 1}}>
                                        <FormLabel>Research Institute</FormLabel>
                                        <Input
                                            name="researchInstitute"
                                            size="sm"
                                            value={formData.researchInstitute}
                                            onChange={handleChange}
                                        />
                                    </FormControl>
                                </Stack>
                                <Stack direction="row" spacing={2}>
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
                                    <FormControl sx={{ flexGrow: 1 }}>
                                        <FormLabel>Display publicly?</FormLabel>
                                        <ToggleButton
                                            value="check"
                                            selected={formData.isEmailPublic}
                                            onChange={() => {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    isEmailPublic: !prev.isEmailPublic
                                                }));
                                            }}
                                            color={formData.isEmailPublic ? "primary" : "standard"}
                                            size="small"
                                            sx={{
                                                height: "38px",
                                                borderRadius: "8px",
                                                textTransform: "none",
                                                fontWeight: "md",
                                                gap: 1,
                                                display: "flex",
                                                justifyContent: "center",
                                                alignItems: "center",
                                                border: "1px solid",
                                                borderColor: "neutral.outlinedBorder",
                                                backgroundColor: formData.isEmailPublic ? "primary.softBg" : "background.body",
                                                "&:hover": {
                                                    backgroundColor: formData.isEmailPublic ? "primary.softHoverBg" : "neutral.softHoverBg"
                                                }
                                            }}
                                        >
                                            {formData.isEmailPublic ? (
                                                <>
                                                    <Visibility fontSize="small" color="primary" />
                                                    <Typography level="body-sm" color="primary">Public</Typography>
                                                </>
                                            ) : (
                                                <>
                                                    <VisibilityOff fontSize="small" />
                                                    <Typography level="body-sm">Hidden</Typography>
                                                </>
                                            )}
                                        </ToggleButton>
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
                        <Card>
                    <Box sx={{ mb: 1 }}>
                        <Typography level="title-md">Change Password</Typography>
                        <Typography level="body-sm">
                            Change the password to your account below.
                        </Typography>
                    </Box>
                    <Divider />
                    <Stack spacing={2} sx={{ my: 1 }}>
                        <FormControl>
                            <FormLabel>Current Password</FormLabel>
                            <Input 
                                type={showPasswords ? "text" : "password"}
                                name="currentPassword"
                                value={passwords.currentPassword}
                                onChange={handlePasswordChange}
                                startDecorator={<LockRounded />}
                                endDecorator={
                                    <IconButton onClick={() => setShowPasswords(!showPasswords)}>
                                        {showPasswords ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                } 
                            />
                        </FormControl>
                        <FormControl error={Boolean(passwords.newPassword && !isNewPasswordSecure(passwords.newPassword))}>
                            <FormLabel>New Password</FormLabel>
                            <Input 
                                type={showPasswords ? "text" : "password"}
                                name="newPassword"
                                value={passwords.newPassword}
                                onChange={handlePasswordChange}
                            />
                            <FormHelperText sx={{ fontSize: 'xs' }}>
                                <InfoOutlined sx={{ 
                                    fontSize: 'sm', 
                                    color: isNewPasswordSecure(passwords.newPassword) ? 'success.plainColor' : 'inherit' 
                                }} />
                                <Typography color={isNewPasswordSecure(passwords.newPassword) ? 'success' : 'neutral'}>
                                    At least 8 characters, including 1 letter and 1 number.
                                </Typography>
                            </FormHelperText>
                        </FormControl>
                        <FormControl error={passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword}>
                            <FormLabel>Confirm New Password</FormLabel>
                            <Input 
                                type={showPasswords ? "text" : "password"}
                                name="confirmPassword"
                                value={passwords.confirmPassword}
                                onChange={handlePasswordChange}
                            />
                            {passwords.confirmPassword && passwords.newPassword !== passwords.confirmPassword && (
                                <FormHelperText color="danger">Passwords do not match.</FormHelperText>
                            )}
                        </FormControl>
                    </Stack>
                    <CardOverflow sx={{ borderTop: "1px solid", borderColor: "divider" }}>
                        <CardActions sx={{ alignSelf: "flex-end", pt: 2 }}>
                            <Button 
                                size="sm" 
                                variant="solid" 
                                color="primary"
                                loading={isPasswordLoading}
                                disabled={!passwords.currentPassword || !passwords.newPassword || passwords.newPassword !== passwords.confirmPassword}
                                onClick={updatePassword}
                            >
                                Update Password
                            </Button>
                        </CardActions>
                    </CardOverflow>
                </Card>

                <Card variant="soft" color="danger">
                    <Box>
                        <Typography level="title-md" color="danger">Danger Zone</Typography>
                        <Typography level="body-sm">
                            Deleting your account is permanent and cannot be undone.
                        </Typography>
                    </Box>
                    <Divider />
                    <CardActions sx={{ alignSelf: 'flex-start', pt: 1 }}>
                        <Button 
                            variant="solid" 
                            color="danger" 
                            onClick={() => setIsDeleteModalOpen(true)}
                        >
                            Delete Account
                        </Button>
                    </CardActions>
                </Card>
                <Modal open={isDeleteModalOpen} onClose={closeDeleteModal}>
                    <ModalDialog variant="outlined" role="alertdialog" sx={{ maxWidth: 400 }}>
                        <ModalClose />
                        <Typography level="h4" startDecorator={<WarningRounded color="danger" />}>
                            Are you absolutely sure?
                        </Typography>
                        <Divider />
                        <Stack spacing={2}>
                            <Typography level="body-md">
                                This action **cannot** be undone. This will permanently delete your profile, 
                                submissions, and all associated data.
                            </Typography>
                            
                            <FormControl>
                                <FormLabel>
                                    Please type <b>DELETE</b> to confirm.
                                </FormLabel>
                                <Input 
                                    placeholder="DELETE"
                                    value={confirmText}
                                    onChange={(e) => setConfirmText(e.target.value)}
                                    color={confirmText === "DELETE" ? "success" : "neutral"}
                                    autoFocus
                                />
                            </FormControl>
                        </Stack>
                        
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', pt: 2 }}>
                            <Button variant="plain" color="neutral" onClick={closeDeleteModal}>
                                Cancel
                            </Button>
                            <Button 
                                variant="solid" 
                                color="danger" 
                                loading={isDeleting} 
                                disabled={confirmText !== "DELETE"} 
                                onClick={handleDeleteAccount}
                            >
                                Permanently Delete
                            </Button>
                        </Box>
                    </ModalDialog>
                </Modal>
                </Stack>
            </Box>
        </Stack>
    );
};

export default AccountSettings;
