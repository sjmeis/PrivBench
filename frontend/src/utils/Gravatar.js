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