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
import Select from "@mui/joy/Select";
import AccessTimeFilledRoundedIcon from "@mui/icons-material/AccessTimeFilledRounded";
import Option from "@mui/joy/Option";
import CardOverflow from "@mui/joy/CardOverflow";
import CardActions from "@mui/joy/CardActions";
import Button from "@mui/joy/Button";
import * as React from "react";

const AccountSettings = ({user}) => {

    return(<Stack spacing={4} sx={{ maxWidth: '800px', mx: 'auto' }}>
        <Typography level="h4">Account Settings</Typography>
        <Box sx={{ flex: 1, width: '100%' }}>

            <Stack
                spacing={4}
                sx={{
                    display: 'flex',
                    maxWidth: '800px',
                    mx: 'auto',
                    px: { xs: 2, md: 6 },
                    py: { xs: 2, md: 3 },
                }}
            >
                <Card>
                    <Box sx={{ mb: 1 }}>
                        <Typography level="title-md">Personal info</Typography>
                        <Typography level="body-sm">
                            Customize how your profile information will apper to the networks.
                        </Typography>
                    </Box>
                    <Divider />
                    <Stack
                        direction="row"
                        spacing={3}
                        sx={{ display: { xs: 'none', md: 'flex' }, my: 1 }}
                    >
                        <Stack direction="column" spacing={1}>
                            <AspectRatio
                                ratio="1"
                                maxHeight={200}
                                sx={{ flex: 1, minWidth: 120, borderRadius: '100%' }}
                            >
                                <img
                                    src={getGravatarUrl(user.mailAddress)}
                                    loading="lazy"
                                    alt=""
                                />
                            </AspectRatio>
                            <IconButton
                                aria-label="upload new picture"
                                size="sm"
                                variant="outlined"
                                color="neutral"
                                sx={{
                                    bgcolor: 'background.body',
                                    position: 'absolute',
                                    zIndex: 2,
                                    borderRadius: '50%',
                                    left: 100,
                                    top: 170,
                                    boxShadow: 'sm',
                                }}
                            >
                                <EditRoundedIcon />
                            </IconButton>
                        </Stack>
                        <Stack spacing={2} sx={{ flexGrow: 1 }}>
                            <Stack spacing={1}>
                                <FormLabel>Username</FormLabel>
                                <FormControl
                                    sx={{ display: { sm: 'flex-column', md: 'flex-row' }, gap: 2 }}
                                >
                                    <Input size="sm" value={user.username}/>
                                </FormControl>
                            </Stack>
                            <Stack direction="row" spacing={2}>
                                <FormControl sx={{ flexGrow: 1 }}>
                                    <FormLabel>Research Institute</FormLabel>
                                    <Input  sx={{ flexGrow: 1 }} size="sm" value={user.researchInstitute} />
                                </FormControl>
                                <FormControl sx={{ flexGrow: 1 }}>
                                    <FormLabel>Email</FormLabel>
                                    <Input
                                        size="sm"
                                        type="email"
                                        startDecorator={<EmailRoundedIcon />}
                                        placeholder="email"
                                        value={user.mailAddress}

                                        sx={{ flexGrow: 1 }}
                                    />
                                </FormControl>
                            </Stack>
                        </Stack>
                    </Stack>
                    <Stack
                        direction="column"
                        spacing={2}
                        sx={{ display: { xs: 'flex', md: 'none' }, my: 1 }}
                    >
                        <Stack direction="row" spacing={2}>
                            <Stack direction="column" spacing={1}>
                                <AspectRatio
                                    ratio="1"
                                    maxHeight={108}
                                    sx={{ flex: 1, minWidth: 108, borderRadius: '100%' }}
                                >
                                    <img
                                        src={getGravatarUrl(user.mailAddress)}
                                        loading="lazy"
                                        alt=""
                                    />
                                </AspectRatio>
                                <IconButton
                                    aria-label="upload new picture"
                                    size="sm"
                                    variant="outlined"
                                    color="neutral"
                                    sx={{
                                        bgcolor: 'background.body',
                                        position: 'absolute',
                                        zIndex: 2,
                                        borderRadius: '50%',
                                        left: 85,
                                        top: 180,
                                        boxShadow: 'sm',
                                    }}
                                >
                                    <EditRoundedIcon />
                                </IconButton>
                            </Stack>
                            <Stack spacing={1} sx={{ flexGrow: 1 }}>
                                <FormLabel>Name</FormLabel>
                                <FormControl
                                    sx={{
                                        display: {
                                            sm: 'flex-column',
                                            md: 'flex-row',
                                        },
                                        gap: 2,
                                    }}
                                >
                                    <Input size="sm" placeholder="First name" />
                                    <Input size="sm" placeholder="Last name" />
                                </FormControl>
                            </Stack>
                        </Stack>
                        <FormControl>
                            <FormLabel>Role</FormLabel>
                            <Input size="sm" defaultValue="UI Developer" />
                        </FormControl>
                        <FormControl sx={{ flexGrow: 1 }}>
                            <FormLabel>Email</FormLabel>
                            <Input
                                size="sm"
                                type="email"
                                startDecorator={<EmailRoundedIcon />}
                                placeholder="email"
                                value={user.mailAddress}
                                sx={{ flexGrow: 1 }}
                            />
                        </FormControl>
                        <div>
                            <FormControl sx={{ display: { sm: 'contents' } }}>
                                <FormLabel>Timezone</FormLabel>
                                <Select
                                    size="sm"
                                    startDecorator={<AccessTimeFilledRoundedIcon />}
                                    defaultValue="1"
                                >
                                    <Option value="1">
                                        Indochina Time (Bangkok){' '}
                                        <Typography textColor="text.tertiary" sx={{ ml: 0.5 }}>
                                            — GMT+07:00
                                        </Typography>
                                    </Option>
                                    <Option value="2">
                                        Indochina Time (Ho Chi Minh City){' '}
                                        <Typography textColor="text.tertiary" sx={{ ml: 0.5 }}>
                                            — GMT+07:00
                                        </Typography>
                                    </Option>
                                </Select>
                            </FormControl>
                        </div>
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

export default AccountSettings;