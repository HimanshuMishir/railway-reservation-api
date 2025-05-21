const { Passenger, Ticket, Berth, RACQueue, WaitingList } = require('../models');
const { Op } = require('sequelize');

const TOTAL_CONFIRMED_BERTHS = 63;
const TOTAL_RAC_SLOTS = 18;
const TOTAL_WAITING_LIST = 10;

const bookTicket = async (req, res) => {
    const passengers = req.body.passengers;

    if (!passengers || !Array.isArray(passengers) || passengers.length === 0) {
        return res.status(400).json({ message: 'Invalid passenger list' });
    }

    const invalidPassenger = passengers.find(
        p => !p.name || typeof p.name !== 'string' ||
            !Number.isInteger(p.age) || p.age < 0 ||
            !['MALE', 'FEMALE', 'OTHER'].includes(p.gender)
    );
    if (invalidPassenger) {
        return res.status(400).json({ message: 'Invalid passenger data' });
    }

    const transaction = await Ticket.sequelize.transaction();

    try {
        const [confirmedCount, racCount, wlCount] = await Promise.all([
            Ticket.count({ where: { status: 'CONFIRMED' } }),
            Ticket.count({ where: { status: 'RAC' } }),
            Ticket.count({ where: { status: 'WAITING' } })
        ]);

        let status = 'WAITING';
        if (confirmedCount < TOTAL_CONFIRMED_BERTHS) status = 'CONFIRMED';
        else if (racCount < TOTAL_RAC_SLOTS) status = 'RAC';
        else if (wlCount < TOTAL_WAITING_LIST) status = 'WAITING';
        else return res.status(400).json({ message: 'No tickets available' });

        const ticket = await Ticket.create({
            status,
            berth_type: status === 'CONFIRMED' ? 'LOWER' : status === 'RAC' ? 'SIDE_LOWER' : 'NONE'
        }, { transaction });

        const passengerPromises = passengers.map(p => Passenger.create({
            name: p.name,
            age: p.age,
            gender: p.gender,
            is_child: p.age < 5,
            TicketId: ticket.id
        }, { transaction }));

        await Promise.all(passengerPromises);

        if (status === 'RAC') {
            await RACQueue.create({ position: racCount + 1, ticket_id: ticket.id }, { transaction });
        } else if (status === 'WAITING') {
            await WaitingList.create({ position: wlCount + 1, ticket_id: ticket.id }, { transaction });
        }

        await transaction.commit();
        return res.status(201).json({ message: 'Ticket booked', ticket_id: ticket.id, status });
    } catch (err) {
        await transaction.rollback();
        console.error('Booking Error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

const cancelTicket = async (req, res) => {
    const { ticketId } = req.params;
    if (!Number.isInteger(Number(ticketId)) || ticketId <= 0) {
        return res.status(400).json({ message: 'Invalid ticket ID' });
    }

    const transaction = await Ticket.sequelize.transaction();

    try {
        const ticket = await Ticket.findByPk(ticketId, { transaction });
        if (!ticket || ticket.status === 'CANCELLED') {
            await transaction.rollback();
            return res.status(404).json({ message: 'Ticket not found or already cancelled' });
        }

        ticket.status = 'CANCELLED';
        await ticket.save({ transaction });

        const racEntry = await RACQueue.findOne({ order: [['position', 'ASC']], transaction });
        if (racEntry) {
            const racTicket = await Ticket.findByPk(racEntry.ticket_id, { transaction });
            racTicket.status = 'CONFIRMED';
            racTicket.berth_type = 'LOWER';
            await racTicket.save({ transaction });
            await RACQueue.destroy({ where: { ticket_id: racEntry.ticket_id }, transaction });

            const remainingRACs = await RACQueue.findAll({ order: [['position', 'ASC']], transaction });
            await Promise.all(remainingRACs.map((r, i) => r.update({ position: i + 1 }, { transaction })));

            const wlEntry = await WaitingList.findOne({ order: [['position', 'ASC']], transaction });
            if (wlEntry) {
                const wlTicket = await Ticket.findByPk(wlEntry.ticket_id, { transaction });
                wlTicket.status = 'RAC';
                wlTicket.berth_type = 'SIDE_LOWER';
                await wlTicket.save({ transaction });
                await WaitingList.destroy({ where: { ticket_id: wlEntry.ticket_id }, transaction });
                await RACQueue.create({ position: remainingRACs.length + 1, ticket_id: wlEntry.ticket_id }, { transaction });

                const remainingWLs = await WaitingList.findAll({ order: [['position', 'ASC']], transaction });
                await Promise.all(remainingWLs.map((w, i) => w.update({ position: i + 1 }, { transaction })));
            }
        }

        await transaction.commit();
        return res.status(200).json({ message: 'Ticket cancelled and queues updated' });
    } catch (err) {
        await transaction.rollback();
        console.error('Cancellation Error:', err);
        return res.status(500).json({ message: 'Internal Server Error' });
    }
};

module.exports = { bookTicket, cancelTicket };