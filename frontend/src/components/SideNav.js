import * as React from 'react';
import Box from '@mui/joy/Box';
import List from '@mui/joy/List';
import ListItem from '@mui/joy/ListItem';
import ListSubheader from '@mui/joy/ListSubheader';
import ListItemButton from '@mui/joy/ListItemButton';
import ListItemDecorator from '@mui/joy/ListItemDecorator';
import ListItemContent from '@mui/joy/ListItemContent';
import PeopleRoundedIcon from '@mui/icons-material/PeopleRounded';
import AssignmentIndRoundedIcon from '@mui/icons-material/AssignmentIndRounded';
import AccountTreeRoundedIcon from '@mui/icons-material/AccountTreeRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';
import ArticleRoundedIcon from '@mui/icons-material/ArticleRounded';
import Chip from '@mui/joy/Chip';

export function SideNav(props) {
    return (
        <Box
            component="nav"
            className="Navigation"
            {...props}
            sx={{
                position: 'sticky', // Make the nav sticky
                top: 0, // Stop when it hits the top of the viewport
                height: '100vh', // Ensure it occupies full height
                overflowY: 'auto', // Allow scrolling if content overflows
                p: 2,
                bgcolor: 'background.surface',
                borderRight: '1px solid',
                borderColor: 'divider',
                display: {
                    xs: 'none',
                    sm: 'block',
                },
            }}
        >
            <List
                size="sm"
                sx={{
                    '--ListItem-radius': 'var(--joy-radius-sm)',
                    '--List-gap': '4px',
                }}
            >
                <ListItem nested>
                    <ListSubheader sx={{ letterSpacing: '2px', fontWeight: '800' }}>
                        User Profile
                    </ListSubheader>
                    <List
                        aria-labelledby="nav-list"
                        sx={{ '& .JoyListItemButton-root': { p: '8px' } }}
                    >
                        <ListItem>
                            <ListItemButton selected>
                                <ListItemDecorator>
                                    <PeopleRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Profile</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton>
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <AssignmentIndRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Account Settings</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton>
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <AccountTreeRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Projects</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton>
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <TodayRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Schedule</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton>
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <ArticleRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Policies</ListItemContent>
                                <Chip variant="soft" color="warning" size="sm">
                                    2
                                </Chip>
                            </ListItemButton>
                        </ListItem>
                    </List>
                </ListItem>
            </List>
        </Box>
    );
}
