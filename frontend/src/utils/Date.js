import {format} from "date-fns";

export const getDateString = (timestamp) => {
    return format(new Date(timestamp), 'dd MMM yyyy')
}