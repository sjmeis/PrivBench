import md5 from "md5";

//fixme: do this properly with user mail
export const generateRandomGravatarUrl = () => {
    const randomEmail = Math.random().toString(36).substring(7) + "@example.com";
    const hash = md5(randomEmail.trim().toLowerCase()); // Using md5 to create a hash
    return `https://www.gravatar.com/avatar/${hash}?d=identicon`; // 'd=identicon' specifies a default random image if no gravatar is found
}