import * as React from 'react';
import Box from '@mui/joy/Box';
import Typography from '@mui/joy/Typography';
import Avatar from '@mui/joy/Avatar';
import Divider from '@mui/joy/Divider';
import Card from '@mui/joy/Card';
import {getGravatarUrl} from "../../utils/Gravatar";
import {Stack} from "@mui/joy";

const UserCard = ({user, cardStyle}) => {
    return (
        user ?
            <Card sx={cardStyle}>

                <Typography level='h2'>Contributor</Typography>
                <Stack spacing={1.5}>
                    <Box sx={{display: 'flex', alignItems: 'center'}}>
                        <Avatar
                            src={user.profilePicturePath || getGravatarUrl(user.mailAddress)}
                        />
                        <Box sx={{ml: 1.5}}>
                            <Typography level="title-lg" color="primary">
                                {user.username}
                            </Typography>
                            <Typography level="body-md" color="neutral">
                                {user.mailAddress}
                            </Typography>
                            <Typography level="body-md" color="neutral">
                                {user.researchInstitute}
                            </Typography>
                        </Box>
                    </Box>
                    <Divider sx={{m: 1}} orientation="horizontal"/>
                    <Box
                        sx={{
                            width: '100%',
                            flexGrow: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'auto',
                            gap: 1,
                        }}
                    >
                        <Typography
                            level="body-sm"
                            sx={{
                                fontWeight: 'bold',
                                marginBottom: 0.5,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                            }}
                        >
                        </Typography>
                    </Box>
                </Stack>

            </Card> : <></>
    );
}

export default UserCard;