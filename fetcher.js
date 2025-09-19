import axios from 'axios';

export async function fetchGuildHtml(guildName, region = 'EU') {
    const url = `https://www.naeu.playblackdesert.com/en-US/Adventure/Guild/GuildProfile?guildName=${guildName}&region=${region}`;
    try {
        console.log(`Fetching roster for ${guildName} from ${url}`);
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error fetching the guild page:', error.message);
        throw new Error('Could not fetch guild roster. The guild name might be incorrect or the website is down.');
    }
}