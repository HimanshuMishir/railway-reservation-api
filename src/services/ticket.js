// src/services/ticketService.js

const sequelize = require("../db");
const Booking = require("../models/booking");
const Ticket = require("../models/ticket");
const { Op } = require("sequelize");

// per-berth confirmed caps
const CONF_CAPS = { LB: 18, MB: 18, UB: 18, SU: 9 };
// RAC & WL caps
const RAC_CAP = 18, WL_CAP = 10;

// numeric berth ranges
const berthRanges = {
    LB: { start: 1, end: 18 },
    MB: { start: 19, end: 36 },
    UB: { start: 37, end: 54 },
    SU: { start: 55, end: 63 }
};

/**
 * Count current usage (only tickets with age>=5 count toward confirmed/RAC/WL caps)
 */
async function getCounts(t) {

    const query = {
        where: { age: { [Op.gte]: 5 } },
        attributes: ["status", "berthType"]
    };
    // only attach transaction if provided
    if (t) query.transaction = t;

    const rows = await Ticket.findAll(query);


    const confirmedByType = { LB: 0, MB: 0, UB: 0, SU: 0 };
    let rac = 0, wl = 0;

    rows.forEach(r => {
        if (r.status === "CONFIRMED") confirmedByType[r.berthType]++;
        else if (r.status === "RAC") rac++;
        else if (r.status === "WAITLIST") wl++;
    });

    return { confirmedByType, rac, wl };
}

/**
 * Find next free berth number for a given type
 */
async function assignBerthByType(type, t) {
    const used = (await Ticket.findAll({
        where: { berthType: type, berthNo: { [Op.ne]: null } },
        attributes: ["berthNo"],
        transaction: t
    })).map(r => r.berthNo);

    const { start, end } = berthRanges[type];
    for (let num = start; num <= end; num++) {
        if (!used.includes(num)) {
            return { berthNo: num, berthType: type };
        }
    }

    throw new Error(`No ${type} berth available`);
}

/**
 * Generate a unique 5-digit bookingId
 */
async function generateBookingId(t) {
    for (let i = 0; i < 5; i++) {
        const id = String(Math.floor(10000 + Math.random() * 90000));
        const exists = await Booking.count({ where: { bookingId: id }, transaction: t });
        if (!exists) return id;
    }
    throw new Error("Unable to generate unique bookingId");
}

/**
 * Book a batch of passengers.
 * Each request object must include { userId, name, age, gender }.
 * Returns { bookingId, tickets }.
 */
async function bookTickets(requests) {
    return await sequelize.transaction({ isolationLevel: "SERIALIZABLE" }, async t => {
        // prevent concurrent oversubscription
        await t.query("LOCK TABLE tickets IN EXCLUSIVE MODE;");

        const bookingId5 = await generateBookingId(t);
        const bookingDate = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

        const booking = await Booking.create({
            bookingId: bookingId5,
            userId: requests[0].userId,
            date: bookingDate
        }, { transaction: t });

        let { confirmedByType, rac, wl } = await getCounts(t);

        // priority: elderly → ladies-with-child → rest
        const elderly = requests.filter(p => p.age >= 60 && p.age >= 5);
        const hasChild = requests.some(p => p.age < 5);
        const ladies = requests.filter(p =>
            p.gender === "FEMALE" && hasChild && p.age >= 5 && !elderly.includes(p)
        );
        const rest = requests.filter(p => !elderly.includes(p) && !ladies.includes(p));
        const ordered = [...elderly, ...ladies, ...rest];

        const created = [];
        for (const p of ordered) {
            let status, berthNo = null, berthType = null;

            if (p.age < 5) {
                // children <5: confirmed but no berth assigned
                status = "CONFIRMED";
            } else if (confirmedByType.LB < CONF_CAPS.LB) {
                ({ berthNo, berthType } = await assignBerthByType("LB", t));
                status = "CONFIRMED"; confirmedByType.LB++;
            } else if (confirmedByType.MB < CONF_CAPS.MB) {
                ({ berthNo, berthType } = await assignBerthByType("MB", t));
                status = "CONFIRMED"; confirmedByType.MB++;
            } else if (confirmedByType.UB < CONF_CAPS.UB) {
                ({ berthNo, berthType } = await assignBerthByType("UB", t));
                status = "CONFIRMED"; confirmedByType.UB++;
            } else if (confirmedByType.SU < CONF_CAPS.SU) {
                ({ berthNo, berthType } = await assignBerthByType("SU", t));
                status = "CONFIRMED"; confirmedByType.SU++;
            } else if (rac < RAC_CAP) {
                status = "RAC"; rac++;
            } else if (wl < WL_CAP) {
                status = "WAITLIST"; wl++;
            } else {
                throw new Error("No tickets available");
            }

            const ticket = await Ticket.create({
                bookingId: booking.id,
                name: p.name,
                age: p.age,
                gender: p.gender,
                status,
                berthNo,
                berthType
            }, { transaction: t });

            created.push(ticket);
        }

        return { bookingId: booking.bookingId, tickets: created };
    });
}

/**
 * Cancel a single ticket by its ticket ID, then promote RAC→CONFIRMED and WL→RAC
 */
async function cancelTicket(ticketId) {
    return await sequelize.transaction({ isolationLevel: "SERIALIZABLE" }, async t => {
        const tk = await Ticket.findByPk(ticketId, { transaction: t });
        if (!tk) throw new Error("Ticket not found");
        await tk.destroy({ transaction: t });

        // promote next RAC → CONFIRMED
        const nextRac = await Ticket.findOne({
            where: { status: "RAC" },
            order: [["createdAt", "ASC"]],
            transaction: t
        });
        if (nextRac) {
            await t.query("LOCK TABLE tickets IN EXCLUSIVE MODE;");
            let { confirmedByType } = await getCounts(t);

            let assign;
            if (confirmedByType.LB < CONF_CAPS.LB) assign = await assignBerthByType("LB", t);
            else if (confirmedByType.MB < CONF_CAPS.MB) assign = await assignBerthByType("MB", t);
            else if (confirmedByType.UB < CONF_CAPS.UB) assign = await assignBerthByType("UB", t);
            else assign = await assignBerthByType("SU", t);

            nextRac.status = "CONFIRMED";
            nextRac.berthNo = assign.berthNo;
            nextRac.berthType = assign.berthType;
            await nextRac.save({ transaction: t });

            // then promote next WAITLIST → RAC
            const nextWl = await Ticket.findOne({
                where: { status: "WAITLIST" },
                order: [["createdAt", "ASC"]],
                transaction: t
            });
            if (nextWl) {
                nextWl.status = "RAC";
                await nextWl.save({ transaction: t });
            }
        }
    });
}

/**
 * List all tickets (ordered by creation time)
 */
async function listBooked() {
    return Ticket.findAll({ order: [["createdAt", "ASC"]] });
}

/**
 * Summary of availability across berth types, RAC, and WAITLIST
 */
async function listAvailable() {
    // no transaction needed for read
    const { confirmedByType, rac, wl } = await getCounts(null);
    return {
        confirmed: {
            LB: { used: confirmedByType.LB, free: CONF_CAPS.LB - confirmedByType.LB },
            MB: { used: confirmedByType.MB, free: CONF_CAPS.MB - confirmedByType.MB },
            UB: { used: confirmedByType.UB, free: CONF_CAPS.UB - confirmedByType.UB },
            SU: { used: confirmedByType.SU, free: CONF_CAPS.SU - confirmedByType.SU }
        },
        RAC: { used: rac, free: RAC_CAP - rac },
        WAITLIST: { used: wl, free: WL_CAP - wl }
    };
}

/**
 * Get all tickets under a given 5-digit bookingId
 */
async function listByBookingId(bookingId5) {
    const booking = await Booking.findOne({
        where: { bookingId: bookingId5 },
        include: [Ticket]
    });
    if (!booking) throw new Error("Booking not found");
    return booking.Tickets;
}

/**
 * Get all tickets for bookings made on a given date (YYYY-MM-DD)
 */
async function listByDate(dateStr) {
    const bookings = await Booking.findAll({
        where: { date: dateStr },
        include: [Ticket]
    });
    // flatten
    return bookings.flatMap(b => b.Tickets);
}

module.exports = {
    bookTickets,
    cancelTicket,
    listBooked,
    listAvailable,
    listByBookingId,
    listByDate
};
