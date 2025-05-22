# Railway Reservation API

A RESTful ticketing service built with **Express.js**, **Sequelize** (Postgres), and **Docker**. Supports per‑berth confirmed caps (18 LB, 18 MB, 18 UB, 9 SU), RAC (18), waiting‑list (10), children handling, priority logic, and promotion on cancellation.

---

## 🗂️ Project Structure

```
railway-reservation/
├── .env                # environment variables
├── Dockerfile
├── docker-compose.yml
├── package.json
└── src
    ├── app.js
    ├── db.js
    ├── models
    │   ├── User.js
    │   ├── Booking.js
    │   └── Ticket.js
    ├── routes
    │   └── tickets.js
    ├── controllers
    │   └── ticketController.js
    └── services
        └── ticketService.js
```

---

## 🚀 Installation & Running

### Prerequisites

* Docker & Docker Compose
  *(or Node.js ≥ 18 & Postgres if running locally)*

### 1. Clone & Configure

```bash
git clone https://github.com/HimanshuMishir/railway-reservation-api.git
cd railway-reservation-api
```

Edit `.env` if needed:

```dotenv
DATABASE_URL=postgres://postgres:postgres@db:5432/postgres
PORT=8000
DB_SSL=false
```

### 2. Docker

Build and launch:

```bash
docker-compose up --build
```

* **Postgres** on `db:5432` (data persisted in Docker volume)
* **API** on `localhost:${PORT}` (default `8000`)

### 3. Local (no Docker)

1. Install dependencies:

   ```bash
   npm install
   ```
2. Ensure a Postgres DB is running and `.env` is set.
3. Start in dev:

   ```bash
   npm run dev
   ```

---

## 📄 API Documentation

Base path: `http://localhost:${PORT}/api/v1/tickets`

All responses use JSON.

### 1. Book Tickets

**POST** `/book`

* **Body**

  ```json
  {
    "userId": "alice123",
    "passengers": [
      { "name":"Bob","age":30,"gender":"MALE" },
      { "name":"Cam","age":2,"gender":"FEMALE" }
    ]
  }
  ```
* **Response** `201 Created`

  ```json
  {
    "bookingId": "12345",
    "tickets": [ /* array of ticket objects */ ]
  }
  ```

### 2. Cancel Ticket

**POST** `/cancel/:ticketId`

* **Example**
  `POST /cancel/uuid-ticket`

* **Response** `200 OK`

  ```json
  { "message": "Canceled and promotions applied." }
  ```

### 3. List All Booked Tickets

**GET** `/booked`

* **Response** `200 OK`

  ```json
  [ /* ticket objects in creation order */ ]
  ```

### 4. Availability Summary

**GET** `/available`

* **Response** `200 OK`

  ```json
  {
    "confirmed": {
      "LB": { "used":10, "free":8 },
      "MB": { "used":5,  "free":13 },
      "UB": { "used":2,  "free":16 },
      "SU": { "used":3,  "free":6 }
    },
    "RAC":      { "used":4,  "free":14 },
    "WAITLIST": { "used":1,  "free":9 }
  }
  ```

### 5. Get Tickets by Booking ID

**GET** `/booking/:bookingId`

* **Example**
  `GET /booking/12345`

* **Response** `200 OK`

  ```json
  [ /* tickets under booking 12345 */ ]
  ```

* **404 Not Found** if no such booking.

### 6. Get Tickets by Date

**GET** `/date?date=YYYY-MM-DD`

* **Example**
  `GET /date?date=2025-05-22`

* **Response** `200 OK`

  ```json
  [ /* all tickets created on 2025-05-22 */ ]
  ```

* **400 Bad Request** if `date` missing or invalid.

---

## 🔧 Notes

* Database schema is synced on startup. For production, use migrations.
* Transactions & table locks ensure caps are never exceeded under concurrency.
* Priority logic: (1) age ≥ 60, (2) ladies with child under 5, (3) rest.
* Children < 5 are CONFIRMED but consume no berth.
* Cancellation promotes next RAC → CONFIRMED and next WAITLIST → RAC.

---

