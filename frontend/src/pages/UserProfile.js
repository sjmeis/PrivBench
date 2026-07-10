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
import {useAuth} from "../contexts/AuthContext";
import {SideNav} from "../components/user/SideNav";
import AccountSettings from "../components/user/AccountSettings";
import {useEffect, useState} from "react";
import UserSubmissions from "../components/user/UserSubmissions";
import PublicProfileEdit from "../components/user/PublicProfileEdit";
import {useLocation} from "react-router-dom";
import MainLayout from "../components/layout/MainLayout";

export default function UserProfile() {
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    const stateFromQuery = queryParams.get("state");
    const state = stateFromQuery || location.state;
    const [selectedItem, setSelectedItem] = useState('profile');
    const { user } = useAuth();

    useEffect(() => {
        if(state){
            setSelectedItem(state)
        }

    }, [state])

    const renderContent = () => {
        switch (selectedItem) {
            case 'account':
                return <AccountSettings user={user} />;
            case 'profile':
                return <PublicProfileEdit user={user} />;
            case 'submissions':
                return <UserSubmissions user={user} />;
            default:
                return <AccountSettings use={user} />;
        }
    };

    return (
        <MainLayout>
        <Box sx={{ display: 'flex', minHeight: "calc(100vh - 65.5px)", bgcolor: 'background.body', marginTop: '-10px', marginBottom: '-40px', marginLeft: '-40px', marginRight: '-40px', overflow: "hidden", }}>
            <SideNav selectedItem={selectedItem} onSelect={setSelectedItem} sx={{ width: 260 }} />
            <Box sx={{ flex: 1, p: 3 }}>{renderContent()}</Box>
        </Box>
        </MainLayout>
    );
}