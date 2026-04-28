# 🌾 AgriInsight Pro — AI-Powered Agricultural Intelligence Platform

![AgriInsight Pro](https://img.shields.io/badge/version-1.0.0-green) ![License](https://img.shields.io/badge/license-MIT-blue) ![Docker](https://img.shields.io/badge/docker-ready-blue) ![Node](https://img.shields.io/badge/node-18+-green)

A full-stack, production-ready agricultural analytics platform with AI predictions, geo visualization, real-time updates, and PDF reporting.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, Tailwind-inspired CSS Variables |
| **Backend** | Node.js 18, Express 4 |
| **Database** | MongoDB 7 (Mongoose ODM) |
| **Charts** | Recharts, Chart.js |
| **Maps** | Leaflet.js + CartoDBDark tiles |
| **Realtime** | Socket.IO 4 |
| **Auth** | JWT (jsonwebtoken + bcryptjs) |
| **ML** | Linear Regression + Exponential Smoothing |
| **Email** | Nodemailer |
| **Deployment** | Docker + docker-compose |

---

## 📁 Project Structure

```
agriinsight-pro/
├── backend/
│   ├── config/           # DB configuration
│   ├── controllers/      # Business logic
│   │   ├── authController.js
│   │   ├── analyticsController.js
│   │   ├── predictionController.js
│   │   ├── uploadController.js
│   │   ├── alertController.js
│   │   └── weatherController.js
│   ├── middleware/       # Auth middleware
│   ├── models/           # MongoDB schemas
│   │   ├── User.js
│   │   ├── AgriData.js
│   │   ├── Alert.js
│   │   └── Prediction.js
│   ├── routes/           # API routes
│   ├── utils/            # Helpers, seeder, cron, socket
│   ├── uploads/          # Uploaded files (temp)
│   ├── server.js
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/   # Layout, shared components
│   │   ├── contexts/     # Auth, Socket, Filter contexts
│   │   ├── pages/        # All page components
│   │   ├── services/     # API service layer
│   │   ├── App.js
│   │   └── index.css     # Design system
│   ├── nginx.conf
│   └── Dockerfile
├── docker-compose.yml
└── README.md
```

---

## ⚡ Quick Start (Local Development)

### Prerequisites
- Node.js 18+
- MongoDB 7+ (local) or MongoDB Atlas URI
- npm or yarn

### 1. Clone & Setup

```bash
git clone <repo-url>
cd agriinsight-pro

# Setup backend
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
npm install

# Setup frontend
cd ../frontend
cp .env.example .env
npm install
```

### 2. Seed Demo Data

```bash
cd backend
npm run seed
# Creates demo user: demo@agriinsight.pro / Demo@123
# Seeds 1320+ agricultural records across 12 states and 10 crops
```

### 3. Start Services

```bash
# Terminal 1 - Backend
cd backend && npm run dev

# Terminal 2 - Frontend
cd frontend && npm start
```

Open **http://localhost:3000**

Login with: `demo@agriinsight.pro` / `Demo@123`

---

## 🐳 Docker Deployment

```bash
# 1. Copy and configure environment
cp .env.example .env
# Edit .env with your secrets

# 2. Build and run
docker-compose up --build -d

# 3. Seed data inside container
docker-compose exec backend node utils/seeder.js

# 4. Open http://localhost
```

---

## ☁️ Cloud Deployment

### MongoDB Atlas
1. Create a free cluster at [mongodb.com/atlas](https://mongodb.com/atlas)
2. Whitelist your IP / set `0.0.0.0/0`
3. Copy the connection string to `MONGODB_URI`

### Railway (Recommended — Free tier)
```bash
# Install Railway CLI
npm install -g @railway/cli
railway login

# Deploy backend
cd backend
railway init
railway up

# Set environment variables in Railway dashboard
# Deploy frontend separately or use Vercel/Netlify
```

### Render
1. Create a **Web Service** → connect your GitHub repo
2. Set **Root Directory** to `backend`
3. Build command: `npm install`
4. Start command: `node server.js`
5. Add all environment variables from `.env.example`
6. Deploy frontend as a **Static Site** (root: `frontend`, build: `npm run build`, publish: `build`)

### AWS EC2
```bash
# SSH into your EC2 instance
ssh ec2-user@your-ip

# Install Docker
sudo yum update -y
sudo amazon-linux-extras install docker
sudo service docker start
sudo usermod -a -G docker ec2-user

# Install docker-compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Clone repo and deploy
git clone <repo-url>
cd agriinsight-pro
cp .env.example .env && nano .env
docker-compose up --build -d
```

---

## 📡 API Documentation

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register new user |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Get current user |
| `PUT` | `/api/auth/profile` | Update profile |
| `PUT` | `/api/auth/password` | Change password |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/analytics/stats` | Dashboard statistics |
| `GET` | `/api/analytics/yield-trend` | Yield over time |
| `GET` | `/api/analytics/crop-comparison` | Compare crops |
| `GET` | `/api/analytics/state-heatmap` | State metrics |
| `GET` | `/api/analytics/price-trend` | Price trends |
| `GET` | `/api/analytics/seasonal` | Seasonal analysis |
| `GET` | `/api/analytics/rainfall` | Rainfall analysis |
| `GET` | `/api/analytics/filters` | Filter options |

All analytics endpoints accept query params: `crop`, `state`, `yearFrom`, `yearTo`

### Predictions (ML)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/predictions/yield` | Yield prediction |
| `POST` | `/api/predictions/price` | Price forecast |
| `GET` | `/api/predictions/history` | Prediction history |
| `GET` | `/api/predictions/multivariate` | Correlation analysis |

**Yield Prediction Request Body:**
```json
{ "crop": "Wheat", "state": "Punjab", "targetYear": 2026 }
```

### Upload

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/upload` | Upload CSV/Excel |
| `GET` | `/api/upload/records` | Get uploaded records |
| `DELETE` | `/api/upload/records` | Delete records |

### Alerts

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/alerts` | Get alerts |
| `POST` | `/api/alerts` | Create alert |
| `PUT` | `/api/alerts/read` | Mark as read |
| `DELETE` | `/api/alerts` | Delete alerts |
| `POST` | `/api/alerts/:id/email` | Send email notification |

### Weather

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/weather` | All states weather |
| `GET` | `/api/weather/:state` | State weather |

---

## 🌐 Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `dashboard:update` | Server → Client | Periodic live stats |
| `data:uploaded` | Server → Client | New data uploaded |
| `alert:new` | Server → Client | New alert created |
| `subscribe:dashboard` | Client → Server | Subscribe to dashboard |
| `subscribe:alerts` | Client → Server | Subscribe to alerts |

---

## 🤖 ML Algorithms

### Yield Prediction — Linear Regression
- **Features**: Year, rainfall
- **Output**: Predicted yield (kg/ha), R² score, RMSE, confidence %
- **Minimum data**: 3 years of historical records

### Price Forecasting — Exponential Smoothing + Regression
- **Alpha**: 0.4 (smoothing factor)
- **Output**: Price forecast with upper/lower confidence bands
- **Minimum data**: 3 years of price records

### Multivariate Analysis — Pearson Correlation
- **Variables**: yield, rainfall, price, temperature, area, production
- **Output**: Full correlation matrix

---

## 📊 CSV/Excel Format

Required columns: `crop`, `state`, `year`

Optional: `season`, `area`, `production`, `yield`, `rainfall`, `temperature`, `price`, `fertilizer`, `pesticide`

**Auto-features:**
- Fuzzy column name matching (e.g. `Crop Name`, `CROP`, `crop_name` all work)
- Missing yield auto-calculated from area + production
- Duplicate detection and removal
- NA/N/A/empty value handling

---

## 🔐 Security Features

- JWT authentication with expiry
- Password hashing (bcrypt, 12 rounds)
- Rate limiting (100 req/15min)
- Helmet.js security headers
- CORS protection
- File type validation
- Input validation

---

## 📧 Email Setup (Gmail)

1. Enable 2FA on your Google account
2. Generate App Password: Account → Security → App Passwords
3. Set `SMTP_USER=your@gmail.com` and `SMTP_PASS=your_app_password`

---

## 🌤️ Weather API

1. Get a free key at [openweathermap.org](https://openweathermap.org/api)
2. Set `OPENWEATHER_API_KEY=your_key`
3. Without a key, mock weather data is returned

---

## 📄 License

MIT License — free to use, modify, and distribute.

---

Built with ❤️ for the Indian agricultural ecosystem
