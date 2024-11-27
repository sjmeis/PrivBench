import md5 from "md5";

export const generateRandomGravatarUrl = () => {
    const randomEmail = Math.random().toString(36).substring(7) + "@example.com";
    const hash = md5(randomEmail.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}

export const getGravatarUrl = (mailAddress) => {
    const hash = md5(mailAddress.trim().toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`;
}