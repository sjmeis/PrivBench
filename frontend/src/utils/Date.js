import {format} from "date-fns";

export const getDateString = (timestamp) => {
    return format(new Date(timestamp), 'dd MMM yyyy')
}

export const getDateTimeString = (timestamp) => {
    return format(new Date(timestamp), 'dd.MM.yy HH:mm');
};

export const isNewDate = (date) => {
    const now = new Date();
    const differenceInMillis = now - new Date(date);
    const differenceInDays = differenceInMillis / (1000 * 60 * 60 * 24);
    return differenceInDays < 7;
}