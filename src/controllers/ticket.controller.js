const ticketService = require("../services/ticket");

exports.book = async (req, res) => {
    try {
        const { userId, passengers } = req.body;
        if (!userId || !Array.isArray(passengers) || !passengers.length) {
            return res.status(400).json({ error: "userId & non-empty passengers[] required" });
        }
        // attach userId
        const reqs = passengers.map(p => ({ ...p, userId }));
        const result = await ticketService.bookTickets(reqs);
        res.status(201).json(result);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.cancel = async (req, res) => {
    try {
        await ticketService.cancelTicket(req.params.id);
        res.json({ message: "Canceled and promotions applied." });
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

exports.listBooked = async (_req, res) => {
    const rows = await ticketService.listBooked();
    res.json(rows);
};

exports.listAvailable = async (_req, res) => {
    const summary = await ticketService.listAvailable();
    res.json(summary);
};

exports.listByBookingId = async (req, res) => {
    const rows = await ticketService.listByBookingId(req.params.bookingId);
    if (!rows.length) return res.status(404).json({ error: "Booking not found" });
    res.json(rows);
};


