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

const ModelCard = ({cardStyle, submission}) => {

    return (
        <Card sx={cardStyle}>

            <CardContent>
                <Stack spacing={1.5}>
                    <Typography level="h2">
                        Model Card:{' '}
                        <Typography
                            level="h2"
                            color='primary'
                            variant="soft"
                            sx={{fontFamily: 'monospace'}}
                        >
                            {submission.metadata.modelName}
                        </Typography>
                    </Typography>


                    <Typography
                        level="body-sm"
                        sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxHeight: '50px',
                            marginBottom: 2,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        <ArticleIcon/>
                        {submission.metadata.modelDescription}
                    </Typography>
                    <Divider sx={{m: 1}} orientation="horizontal"/>


                    <Stack direction='row' spacing={2}>
                        <Box sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
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
                                <LockOpenIcon/>
                                License
                            </Typography>
                            <Typography level="body-sm" sx={{p: '1px', fontWeight: 'bold'}}>


                            </Typography>
                            <Typography sx={{fontWeight: 'bold'}} level="body-sm"
                                        variant="soft">{submission.metadata.license}</Typography>
                        </Box>
                        <Box sx={{display: 'flex', flexDirection: 'row', gap: 1}}>
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
                                <CalendarMonthIcon/>
                                Submission Date
                            </Typography>
                            <Typography sx={{fontWeight: 'bold'}} level="body-sm"
                                        variant="soft">{getDateString(submission.submissionDate)}</Typography>
                        </Box>

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