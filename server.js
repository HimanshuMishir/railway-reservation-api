const express = require('express');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const db = require('./src/db');
const ticketRoutes = require('./src/routes/ticket.routes');

const app = express();
dotenv.config();

app.use(bodyParser.json());
app.use('/api/v1/tickets', ticketRoutes);

const PORT = process.env.PORT || 3000;

(async () => {
    try {
        await db.sync();
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
    } catch (err) {
        console.error('Failed to sync DB or start server:', err);
    }
})();