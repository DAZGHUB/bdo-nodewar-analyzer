const express = require('express');
const { fetchGuildHtml } = require('./fetcher.js');
const app = express();
const port = 3000; 


app.get('/api/fetch-roster', async (req, res) => {
    const { guildName } = req.query; /

    if (!guildName) {
        return res.status(400).send({ error: 'Guild name is required.' });
    }

    try {
        const html = await fetchGuildHtml(guildName);
        res.send(html); // Send the fetched HTML back to the front-end
    } catch (error) {
        res.status(500).send({ error: error.message });
    }
});

app.use(express.static('.'));

app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});