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


import {Card, CardContent, Typography, Box, Chip, Button, Stack, Divider} from '@mui/joy';
import GitHubIcon from '@mui/icons-material/GitHub';
import TagIcon from '@mui/icons-material/LocalOffer';
import ArticleIcon from '@mui/icons-material/Article';
import AutoStoriesIcon from '@mui/icons-material/AutoStories';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import {getDateString} from "../../utils/Date";
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import * as React from "react";
import ModelCardTextPairs from "../shared/ModelCardTextPairs";
import {useSnackbar} from "../../contexts/SnackbarProvider";


const ModelCard = ({cardStyle, submission}) => {

    const { showSnackbar } = useSnackbar();
    const handleRedirect = (url) => {
        window.open(url, "_blank");
    };
    const handleCopy = () => {
        const bibtexCitation = submission.metadata.bibtexCitation;
        if (bibtexCitation) {
            navigator.clipboard.writeText(bibtexCitation).then(() => {
                showSnackbar("Bibtex Citation copied to clipboard!", "success");
            }).catch(err => {
                console.error("Error copying text to clipboard: ", err);
                showSnackbar("Failed to copy Bibtex Citation", "error");
            });
        }
    };


    return (
        <Card sx={cardStyle}>

            <CardContent>
                <Stack spacing={1.5}>
                    <Typography level="h2">
                        <Typography
                            level="h2"
                            color='primary'
                            variant="soft"
                            sx={{fontFamily: 'monospace'}}
                        >
                            {submission.name}
                        </Typography>
                    </Typography>


                    <Typography
                        level="body-sm"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxHeight: '45px',
                            display: 'flex',
                            gap: 1,
                        }}
                    >
                        <ArticleIcon/>
                        {submission.metadata.modelDescription}
                    </Typography>
                    <Divider sx={{m: 1}} orientation="horizontal"/>


                    <Stack direction='row' spacing={2}>
                        <ModelCardTextPairs icon={<LockOpenIcon />} content={submission.metadata.license} title={'License'}/>
                        <ModelCardTextPairs icon={<CalendarMonthIcon />} content={getDateString(submission.submissionDate)} title={'Submission Date'}/>
                    </Stack>
                    <Divider sx={{m: 1}} orientation="horizontal"/>

                    <Stack spacing={1} direction='row'>
                        <Button
                            onClick={() => handleRedirect(submission.metadata.githubUrl)}
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{
                                gap: 1,
                            }}
                            startDecorator={<GitHubIcon/>}
                        >
                            GitHub Repository
                        </Button>
                        <Button
                            onClick={() => handleRedirect(submission.metadata.researchPaperUrl)}
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{
                                gap: 1,
                            }}
                            startDecorator={<AutoStoriesIcon/>}
                        >
                            Research Paper
                        </Button>
                        <Button
                            onClick={handleCopy}
                            variant="outlined"
                            size="small"
                            color="primary"
                            sx={{
                                gap: 1,
                            }}
                            startDecorator={<ContentCopyIcon/>}
                        >
                            Bibtex Citation
                        </Button>
                    </Stack>

                    <Divider sx={{m: 1}} orientation="horizontal"/>
                    <Box sx={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 1}}>

                        <Box sx={{display: 'flex', gap: 1, flexWrap: 'wrap'}}>
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
                                <TagIcon/>
                                Tags
                            </Typography>
                            {submission?.metadata?.tags?.map(tag => (
                                <Chip
                                    variant="outlined"
                                    size="md">{tag}</Chip>
                            ))}
                        </Box>
                    </Box>
                </Stack>
            </CardContent>
        </Card>
    );
}

export default ModelCard;