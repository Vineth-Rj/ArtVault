# 🎨 ARTVAULT

**ARTVAULT** is a community-powered digital art marketplace designed to help emerging and overlooked artists build visibility and establish a market around their work.

Artists can upload artworks and create a fixed number of **Art Units**. Users can buy, hold, and trade complete Art Units with other collectors. The platform provides transparent market information such as trading activity, price, and liquidity instead of relying only on likes and followers.

Gemini AI is used to understand artworks and improve discovery through categories, tags, descriptions, and search keywords.

## ✨ Features

* 🎨 Artwork upload and discovery
* 🧩 Art Unit creation and ownership
* 💰 Primary and secondary marketplace
* 📈 Market price and trading activity
* 💧 Liquidity indicators
* 🔄 Buy/sell order matching
* 🛡️ Trade validation and anti-manipulation checks
* 🤖 Gemini-powered artwork understanding
* 👤 Artist and collector profiles
* 📊 Portfolio and trade history
* 💳 Simulated credits for the MVP

## 🛠️ Tech Stack

**Frontend**

* React
* JavaScript
* HTML/CSS

**Backend**

* Node.js
* Express.js
* Prisma ORM

**Database & Storage**

* PostgreSQL
* Supabase
* Supabase Storage

**AI**

* Google Gemini API

## 📁 Project Structure

```text
artvault/
├── client/                 # React frontend
├── server/
│   ├── controllers/
│   ├── db/
│   │   └── schema.prisma
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── tests/
│   ├── utils/
│   ├── .env.example
│   ├── package.json
│   └── server.js
├── .gitignore
└── README.md
```

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/Vineth-Rj/ArtVault.git
cd ArtVault
```

### 2. Backend setup

```bash
cd server
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `server` folder:

```env
DATABASE_URL=
DIRECT_URL=

JWT_SECRET=

PORT=4000
CLIENT_URL=http://localhost:3000

GEMINI_API_KEY=

SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_STORAGE_BUCKET=artworks
```

Use your own Supabase and Gemini credentials.

### 4. Setup Prisma database

```bash
npx prisma validate
npx prisma generate
npx prisma db push
```

### 5. Start the backend

```bash
npm start
```

If the project uses a development script:

```bash
npm run dev
```

### 6. Frontend setup

Open another terminal:

```bash
cd client
npm install
npm run dev
```

The frontend will normally run on:

```text
http://localhost:3000
```

The backend runs on:

```text
http://localhost:4000
```

## 🗄️ Supabase Setup

Create a Supabase project and configure:

* PostgreSQL database
* Database connection URLs
* Storage bucket named `artworks`

Prisma handles the database schema, so tables do not need to be created manually.

## 🔐 Environment Variables

Never commit `.env` files or API keys.

The repository contains:

```text
server/.env.example
```

as a template for required environment variables.

## 🚧 Project Status

ARTVAULT is currently a **hackathon MVP** using simulated credits.

The prototype focuses on demonstrating:

**Artwork → Art Units → Ownership → Trading → Price Discovery → Liquidity**

Real-money trading and production deployment would require additional security, legal, and regulatory review.

## 👥 Team

Built for **HackDays** by the ARTVAULT team.
