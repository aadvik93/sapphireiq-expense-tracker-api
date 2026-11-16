# Expense Tracker API

A Node.js 18+, Express, and MongoDB/Mongoose REST API for managing expenses, filtering by category and date, generating aggregation reports, and checking monthly budgets.

## Run locally

1. Install Node.js 18+ and MongoDB, or create a MongoDB Atlas database.
2. Copy `.env.example` to `.env` and set `MONGODB_URI`.
3. Run `npm install`.
4. Start the API with `npm run dev` or `npm start`.
5. Check `http://localhost:5000/api/health`.

The API stores money as integer minor units to prevent floating-point rounding. Requests and responses expose decimal `amount` values (up to two decimal places); all amounts use the same currency/unit chosen by the caller.

## Endpoints

All routes are under `/api`. Successful responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "error": { "message": ... } }`. Validation errors include field-level details.

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Health check |
| POST | `/expenses` | Create an expense |
| GET | `/expenses` | List, filter, sort, and paginate expenses |
| GET | `/expenses/:id` | Get one expense |
| PATCH | `/expenses/:id` | Update an expense |
| DELETE | `/expenses/:id` | Delete an expense (204 response) |
| GET | `/reports/monthly?year=2026` | Monthly totals and expense counts for a year |
| GET | `/reports/categories?from=2026-01-01&to=2026-01-31` | Category totals, optionally date-filtered |
| PUT | `/budgets/:month` | Set or update a monthly budget (`YYYY-MM`) |
| GET | `/budgets/:month/status` | Compare month spending with its budget |

### Expense schema

```json
{
  "amount": 24.5,
  "category": "food",
  "date": "2026-05-17T12:00:00.000Z",
  "description": "Lunch",
  "merchant": "Cafe"
}
```

`amount` must be positive and have at most two decimal places. `category` is required. `date` accepts an ISO date or date-time. `description` and `merchant` are optional.

### Filtering and pagination

`GET /api/expenses` supports:

- `category=food`
- `from=2026-05-01` and `to=2026-05-31` (inclusive UTC dates; either can be used alone)
- `page=1` and `limit=20` (maximum limit 100)
- `sortBy=date|amount|category|createdAt` and `order=asc|desc`

Example: `GET /api/expenses?category=food&from=2026-05-01&to=2026-05-31&page=1&limit=20`

### Reports and budgets

Monthly and category reports use MongoDB aggregation pipelines with `$group` and `$sum`. The monthly report always returns all 12 months, using zero totals for months without expenses. Category reports accept the same inclusive UTC `from`/`to` date filters.

Set a monthly budget with:

```bash
curl -X PUT http://localhost:5000/api/budgets/2026-05 \
  -H 'Content-Type: application/json' \
  -d '{"amount":1000,"alertThreshold":80}'
```

`alertThreshold` is a percentage of the budget limit and defaults to 100. The status endpoint reports `spent`, `remaining`, `thresholdReached`, and `overBudget`.

## Example requests

```bash
curl -X POST http://localhost:5000/api/expenses \
  -H 'Content-Type: application/json' \
  -d '{"amount":24.50,"category":"food","date":"2026-05-17","description":"Lunch"}'

curl 'http://localhost:5000/api/reports/monthly?year=2026'
curl 'http://localhost:5000/api/reports/categories?from=2026-05-01&to=2026-05-31'
```

## Automated tests

Run `npm test`. Jest and Supertest exercise the Express endpoints against an isolated in-memory MongoDB. Tests cover expense CRUD, validation, filtering, date boundaries, monthly and category aggregation, and budget thresholds.

## Project structure

```text
src/
  app.js                    Express setup and route wiring
  server.js                 Startup and graceful shutdown
  config/database.js        MongoDB connection and index setup
  controllers/              Expense CRUD, reports, and budgets
  middleware/               Validation, async, not-found, and errors
  models/                   Expense and monthly budget schemas
  routes/                   REST endpoint definitions
  services/budgetService.js Budget comparison business logic
  validators/schemas.js     Zod request validation
tests/api.test.js           Jest/Supertest integration suite
```
