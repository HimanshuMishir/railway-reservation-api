const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');

router.post('/book', ticketController.bookTicket);
router.post('/cancel/:ticketId', ticketController.cancelTicket);

module.exports = router;