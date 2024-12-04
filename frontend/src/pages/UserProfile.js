import * as React from 'react';
import Box from '@mui/joy/Box';
import {useAuth} from "../contexts/AuthContext";
import {SideNav} from "../components/userProfile/SideNav";
import AccountSettings from "../components/userProfile/AccountSettings";
import {useEffect, useState} from "react";
import UserSubmissions from "../components/userProfile/UserSubmissions";
import PublicProfileEdit from "../components/userProfile/PublicProfileEdit";
import {useLocation} from "react-router-dom";


export default function UserProfile() {
    const {state} = useLocation();
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
                return <PublicProfileEdit />;
            case 'submissions':
                return <UserSubmissions user={user} />;
            default:
                return <AccountSettings use={user} />;
        }
    };

    //todo: implement form logic if used
    return (

        <Box sx={{ display: 'flex', minHeight: "calc(100vh - 65.5px)", bgcolor: 'background.body', marginTop: '-10px', marginBottom: '-40px', marginLeft: '-40px', marginRight: '-40px' }}>
            <SideNav selectedItem={selectedItem} onSelect={setSelectedItem} sx={{ width: 260 }} />
            <Box sx={{ flex: 1, p: 3 }}>{renderContent()}</Box>
        </Box>

    );
}