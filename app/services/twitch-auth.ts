export const postTwitchAuth = async (clientId: string, clientSecret: string) => {
    const response = await fetch(`https://id.twitch.tv/oauth2/token?client_id=${clientId}&client_secret=${clientSecret}&grant_type=client_credentials`, {
        method: 'POST',
    });

    return await response.json();
};