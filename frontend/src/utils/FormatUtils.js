export const formatToTwoDecimals = (value) => {
    if (value === undefined || value === null) return 'N/A';
    return Number(value).toFixed(2);
};