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
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import Chip from '@mui/joy/Chip';
import * as rankingService from "../../services/RankingsService";
import {useEffect, useState} from "react";

export function SideNav({ selectedItem, onSelect }) {
    const [submissionsCount, setSubmissionsCount] = useState(0)

    const fetchSubmissionsCount = async () => {
        try {
            const data = await rankingService.getUserSubmissionsCount();
            setSubmissionsCount(data.submissionCount);
        } catch (err) {
            console.log('Submissions Count error fetching')
        }
    };

    useEffect(() => {

        fetchSubmissionsCount();
    }, []);


    return (
        <Box
            component="nav"
            className="Navigation"
            sx={{
                width: '220px',
                position: 'sticky',
                top: 0,
                minHeight: "calc(100vh - 65.5px)",
                overflowY: 'auto',
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
                            <ListItemButton
                                selected={selectedItem === 'account'}
                                onClick={() => onSelect('account')}
                            >
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <AssignmentIndRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Account Settings</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton
                                selected={selectedItem === 'profile'}
                                onClick={() => onSelect('profile')}
                            >
                                <ListItemDecorator>
                                    <PeopleRoundedIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Public Profile</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton
                                selected={selectedItem === 'submissions'}
                                onClick={() => onSelect('submissions')}>
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <EmojiEventsIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Submissions</ListItemContent>
                                {submissionsCount > 0 && <Chip variant="soft" color="success" size="sm">
                                    {submissionsCount}
                                </Chip>}
                            </ListItemButton>
                        </ListItem>
                    </List>
                </ListItem>
            </List>
        </Box>
    );
}
