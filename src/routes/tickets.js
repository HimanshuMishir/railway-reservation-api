const express = require("express");
const router = express.Router();
const ticketCtrl = require("../controllers/ticketController");

// booking, single batch
router.post("/book", ticketCtrl.book);

// cancel by passenger id
router.post("/cancel/:id", ticketCtrl.cancel);

// list all booked
router.get("/booked", ticketCtrl.listBooked);

// availability summary
router.get("/available", ticketCtrl.listAvailable);

// tickets by bookingId
router.get("/booking/:bookingId", ticketCtrl.listByBookingId);


module.exports = router;
