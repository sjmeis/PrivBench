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

export function SideNavAdmin({ selectedItem, onSelect }) {

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
                    </List>
                </ListItem>
            </List>
        </Box>
    );
}
