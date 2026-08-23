# ZERA Backend Foundation

This directory contains the backend foundation for the ZERA platform.

## Stack

- Node.js + Express
- MySQL
- Prisma ORM
- JWT-based authentication flow
- REST API structure

## Structure

```text
backend/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   ├── app.js
│   └── server.js
├── .env.example
├── package.json
└── README.md
```

## Database setup

1. Create or use the existing MySQL database named zera_db.
2. Set the connection string in your local environment using the MySQL format shown in the project .env.example file.
3. Run Prisma migration commands when ready.

```bash
cd backend
npm install
npx prisma migrate dev --name init
npm run dev
```

## Notes

This is the architecture and data-layer foundation only. Authentication, AI integration, and real business logic are intentionally not implemented yet.
