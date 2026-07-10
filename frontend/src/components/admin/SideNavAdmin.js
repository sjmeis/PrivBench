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
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import GroupIcon from '@mui/icons-material/Group';
import HistoryIcon from '@mui/icons-material/History';
import PublishIcon from '@mui/icons-material/Publish';
import TerminalIcon from '@mui/icons-material/Terminal';
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import ManageAccountsIcon from '@mui/icons-material/ManageAccounts';

export function SideNavAdmin({ selectedItem, onSelect, isSuperAdmin }) {

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
                        Admin Panel
                    </ListSubheader>
                    <List
                        aria-labelledby="nav-list"
                        sx={{ '& .JoyListItemButton-root': { p: '8px' } }}
                    >

                        <ListItem>
                            <ListItemButton
                                selected={selectedItem === 'modules'}
                                onClick={() => onSelect('modules')}
                            >
                                <ListItemDecorator sx={{ color: 'neutral.500' }}>
                                    <ViewModuleIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Modules</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                            <ListItemButton
                                selected={selectedItem === 'datasets'}
                                onClick={() => onSelect('datasets')}
                            >
                                <ListItemDecorator>
                                    <InsertDriveFileIcon fontSize="small" />
                                </ListItemDecorator>
                                <ListItemContent>Datasets</ListItemContent>
                            </ListItemButton>
                        </ListItem>
                        <ListItem>
                        <ListItemButton
                            selected={selectedItem === 'users'}
                            onClick={() => onSelect('users')}
                        >
                            <ListItemDecorator>
                                <GroupIcon fontSize="small" />
                            </ListItemDecorator>
                            <ListItemContent>Users</ListItemContent>
                        </ListItemButton>
                        </ListItem>
                        <ListItemButton
                            selected={selectedItem === 'submissions'}
                            onClick={() => onSelect('submissions')}
                        >
                            <ListItemDecorator>
                                <PublishIcon fontSize="small" />
                            </ListItemDecorator>
                            <ListItemContent>Submissions</ListItemContent>
                        </ListItemButton>
                        <ListItemButton
                            selected={selectedItem === 'versions'}
                            onClick={() => onSelect('versions')}
                        >
                            <ListItemDecorator>
                                <HistoryIcon fontSize="small" />
                            </ListItemDecorator>
                            <ListItemContent>Versions</ListItemContent>
                        </ListItemButton>
                        <ListItemButton
                            selected={selectedItem === 'orchestration'}
                            onClick={() => onSelect('orchestration')}
                            color="primary"
                            variant={selectedItem === 'orchestration' ? 'soft' : 'plain'}
                        >
                            <ListItemDecorator>
                                <TerminalIcon fontSize="small" />
                            </ListItemDecorator>
                            <ListItemContent>Module Orchestration</ListItemContent>
                        </ListItemButton>
                        <ListItemButton 
                            selected={selectedItem === 'demo'} 
                            onClick={() => onSelect('demo')}
                            >
                            <ListItemDecorator><SlideshowIcon /></ListItemDecorator>
                            <ListItemContent>Demo Data</ListItemContent>
                        </ListItemButton>
                        <ListItemButton 
                            selected={selectedItem === 'health'} 
                            onClick={() => onSelect('health')}
                            >
                            <ListItemDecorator><MonitorHeartIcon /></ListItemDecorator>
                            <ListItemContent>System Health</ListItemContent>
                        </ListItemButton>
                        {isSuperAdmin && (
                            <ListItem>
                                <ListItemButton 
                                    selected={selectedItem === 'team'} 
                                    onClick={() => onSelect('team')}
                                    color="danger"
                                    variant={selectedItem === 'team' ? 'soft' : 'plain'}
                                    sx={{ fontWeight: 'bold' }}
                                >
                                    <ListItemDecorator><ManageAccountsIcon /></ListItemDecorator>
                                    <ListItemContent>Admin Team</ListItemContent>
                                </ListItemButton>
                            </ListItem>
                        )}
                    </List>
                </ListItem>
            </List>
        </Box>
    );
}
