require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const sequelize = require("./db");
const ticketRoutes = require("./routes/tickets");

const app = express();
const PORT = process.env.PORT || 8000;

app.use(bodyParser.json());
app.use("/api/v1/tickets", ticketRoutes);

// initialize DB
; (async () => {
    try {
        await sequelize.authenticate();
        await require("./models/passenger").sync();
        console.log("✅ Database connected");
    } catch (err) {
        console.error("❌ DB connection failed:", err);
        process.exit(1);
    }
})();

app.listen(PORT, () => {
    console.log(`🚆 API running on http://0.0.0.0:${PORT}`);
});
