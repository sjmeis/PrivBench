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

const ModelCard = ({cardStyle, submission}) => {

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
                            href={submission.metadata.githubUrl}
                            target="_blank"
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
                            href={submission.metadata.researchPaperUrl}
                            target="_blank"
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
                            href={submission.metadata.bibtexCitation}
                            target="_blank"
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