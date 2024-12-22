import React from "react";
import {useNavigate} from "react-router-dom";
import {
    Avatar,
    Dropdown,
    Grid,
    ListDivider,
    Menu,
    MenuButton,
    MenuItem,
    Stack,
    useColorScheme
} from "@mui/joy";
import {Box, Button, Typography} from "@mui/joy";
import {DarkMode, Info, Timeline, UploadFile, Login} from "@mui/icons-material";
import {useAuth} from '../../contexts/AuthContext';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import LogoutRoundedIcon from '@mui/icons-material/LogoutRounded';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import {getGravatarUrl} from "../../utils/Gravatar";
import {getUserSubmissions} from '../../services/RankingsService';
import ViewModuleIcon from "@mui/icons-material/ViewModule";


const Navbar = () => {
    const navigate = useNavigate();
    const {mode, setMode} = useColorScheme();
    const {user, logout} = useAuth();

    const navButtonStyle = {
        textTransform: "none",
        fontWeight: "medium",
        fontSize: "18px",
        paddingTop: 0,
        paddingBottom: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
    }

    // Avoid returning early before hooks are called
    const isLightMode = mode === 'light';

    const handleChange = () => {
        setMode(mode === 'dark' ? 'light' : 'dark');
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleSubmissionClick = async () => {
        // If the user is not logged in, redirect to /login
        if (!user) {
            navigate("/login");
            return;
        }
        try {
            // Fetch user submissions
            const data = await getUserSubmissions();
            const pendingSubmission = data.submissions.find(sub => sub.status === "pending");

            if (pendingSubmission) {
                navigate("/upload", {
                    state: {
                        currentStep: 1,
                        metadata: pendingSubmission.metadata,
                        submissionId: pendingSubmission.id
                    }
                });
            } else {
                // No pending submission, navigate with initial state
                navigate("/upload", {
                    state: {
                        currentStep: 0,
                        metadata: {}
                    }
                });
            }
        } catch (error) {
            console.error("An error occurred while fetching user submission:", error);
        }
    };


    // Only return null if mode is falsy, after all hooks are called
    if (!mode) {
        return null;
    }

    return (
        <Box
            sx={{
                width: '100%',
                padding: 1.5,
                borderBottom: isLightMode ? '1.5px solid #f0f4f8' : '1.5px solid #161a1b',
            }}
        >
            <Grid container alignItems="center">
                <Grid item xs={1} container justifyContent="flex-start">
                    <Typography
                        onClick={() => navigate("/")}
                        level="h2"
                        sx={{cursor: 'pointer'}}
                    >
                        PrivBench
                    </Typography>
                </Grid>
                <Grid item xs={10} container justifyContent="center">
                    <Stack direction='row' spacing={2}>
                        <Button
                            onClick={() => navigate("/rankings")}
                            variant='text'
                            startDecorator={<Timeline/>}
                            sx={navButtonStyle}
                        >
                            Rankings
                        </Button>
                        {user.admin ? <Button
                            onClick={() => navigate("/admin")}
                            variant='text'
                            startDecorator={<ViewModuleIcon/>}
                            sx={navButtonStyle}
                        >
                            Modules Management
                        </Button>:  <Button
                            onClick={handleSubmissionClick}
                            variant='text'
                            startDecorator={<UploadFile/>}
                            sx={navButtonStyle}
                        >
                            Submission
                        </Button> }
                        <Button
                            onClick={() => navigate("/information")}
                            variant='text'
                            startDecorator={<Info/>}
                            sx={navButtonStyle}
                        >
                            How does it work?
                        </Button>
                    </Stack>

                </Grid>

                <Grid item xs={1} container justifyContent="flex-end" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                        <Button
                            onClick={handleChange}
                            variant="outlined"
                            color="neutral"
                            size="sm"
                            sx={{
                                height: 36,
                                width: 36,
                                minWidth: 'auto',
                                padding: 0,
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <DarkMode/>
                        </Button>

                        {user ? (
                            <Dropdown>
                                <MenuButton endDecorator={<Avatar sx={{maxWidth: 28, maxHeight: 28}} size="sm"
                                                                  src={getGravatarUrl(user.mailAddress)}/>}
                                            variant="soft"
                                            color="primary">
                                    {user.username}
                                </MenuButton>
                                <Menu
                                    placement="bottom-end"
                                    size="sm"
                                    sx={{
                                        zIndex: '99999',
                                        p: 1,
                                        gap: 1,
                                        '--ListItem-radius': 'var(--joy-radius-sm)',
                                    }}
                                >
                                    <MenuItem onClick={() => navigate("/profile", {state: 'account'})}>
                                        <Box sx={{display: 'flex', alignItems: 'center'}}>
                                            <Avatar
                                                src={getGravatarUrl(user.mailAddress)}
                                                sx={{borderRadius: '50%'}}
                                            />
                                            <Box sx={{ml: 1.5}}>
                                                <Typography level="title-sm" textColor="text.primary">
                                                    {user.username}
                                                </Typography>
                                                <Typography level="body-xs" textColor="text.tertiary">
                                                    {user.mailAddress}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </MenuItem>
                                    <ListDivider/>
                                    {
                                        user.admin ? (
                                            <>
                                                <MenuItem onClick={() => navigate("/admin", { state: 'modules' })}>
                                                    <EmojiEventsIcon />
                                                    Modules
                                                </MenuItem>
                                                <MenuItem onClick={() => navigate("/admin", { state: 'datasets' })}>
                                                    <SettingsRoundedIcon />
                                                    Datasets
                                                </MenuItem>
                                            </>
                                        ) : (
                                            <>
                                                <MenuItem onClick={() => navigate("/profile", { state: 'submissions' })}>
                                                    <EmojiEventsIcon />
                                                    My Submissions
                                                </MenuItem>
                                                <MenuItem onClick={() => navigate("/profile", { state: 'account' })}>
                                                    <SettingsRoundedIcon />
                                                    Settings
                                                </MenuItem>
                                            </>
                                        )
                                    }

                                    <ListDivider/>
                                <MenuItem component="a">
                                    First look at tbd
                                    <OpenInNewRoundedIcon/>
                                </MenuItem>
                                <MenuItem
                                    component="a"
                                >
                                    Sourcecode
                                    <OpenInNewRoundedIcon/>
                                </MenuItem>
                                <ListDivider/>
                                <MenuItem onClick={handleLogout}>
                                    <LogoutRoundedIcon/>
                                    Log out
                                </MenuItem>
                            </Menu>
                            </Dropdown>
                            ) : (
                            <Button
                            variant="soft"
                            color="primary"
                            startDecorator={<Login />}
                           onClick={() => navigate('/login')}
                    >
                        Login
                    </Button>
                    )}
                </Stack>
            </Grid>
        </Grid>
</Box>
)
    ;
}

export default Navbar;

