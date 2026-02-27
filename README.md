# Bitespeed Identity Reconciliation Service

Mission: Help Doc Brown consolidate customer identities on FluxKart.com by linking multiple purchases with overlapping contact information into a single customer profile.

## 🚀 Live Endpoint
**[https://bitespeed-backend-project-zsh6.onrender.com/identify](https://bitespeed-backend-project-zsh6.onrender.com/identify)**
*Hosted on Render*

## 🛠️ Tech Stack
- **Backend**: Node.js, Express.js (TypeScript)
- **Database**: Supabase (PostgreSQL)
- **ORM**: Prisma
- **Hosting**: Render.com

## 📡 API Endpoint

### `POST /identify`
Consolidates customer contact information.

**Request Body (JSON):**
```json
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
```

**Response (JSON):**
```json
{
  "contact": {
    "primaryContatctId": 1,
    "emails": ["lorraine@hillvalley.edu", "mcfly@hillvalley.edu"],
    "phoneNumbers": ["123456"],
    "secondaryContactIds": [2]
  }
}
```

## 💻 Local Setup

1. **Clone the repository** (if you have the URL).
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="your-pooling-url"
   DIRECT_URL="your-direct-url"
   PORT=3000
   ```
4. **Run Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```
5. **Start Development Server**:
   ```bash
   npm run dev
   ```

## 🧪 Testing
Run the included test script to verify reconciliation logic:
```bash
node tests/test-identify.js
```

## 🚢 Deployment (Render)
1. Push this code to a GitHub repository.
2. Connect the repository to **Render.com** (Web Service).
3. Set **Build Command**: `npm install && npm run build`
4. Set **Start Command**: `npx prisma generate && npm run start`
5. Add your `.env` variables in the Render dashboard.
