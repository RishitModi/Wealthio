# Wealthio

A comprehensive **fintech platform for personal wealth management** with AI-powered investment recommendations and real-time market data integration.

## Overview

Wealthio is a full-stack application designed to help individuals assess their investment risk profile and manage their wealth. The platform integrates three core services:

### 🎯 Core Features

- **User Authentication & Profiles**: Secure registration, login, and JWT-based authentication
- **Financial Onboarding**: Collect user financial information (income, savings, investment goals)
- **AI-Powered Risk Profiling**: K-Means clustering model to classify investors into risk categories (Conservative, Moderate, Aggressive)
- **Portfolio Management**: Track and manage investment allocations
- **Real-Time Market Data**: 
  - Stock prices and historical data (via yfinance)
  - Cryptocurrency prices (via CoinGecko)
  - Gold & Silver rates
  - Company fundamentals (via Alpha Vantage)
- **Dashboard**: Personalized investment dashboard with recommendations
- **Risk Assessment Tools**: Interactive questionnaire to determine optimal investment strategy

---

## Technology Stack

### Frontend
- **React 19** with TypeScript support
- **Vite** (lightning-fast build tool)
- **Tailwind CSS** (utility-first styling)
- **React Router** (client-side routing)
- **Axios** (HTTP client with interceptors)

**Key Routes:**
- `/login` - User authentication
- `/register` - New user registration
- `/onboarding` - First-time financial information collection
- `/risk-assessment` - Interactive risk profiling questionnaire
- `/dashboard` - Personalized investment dashboard

### Backend
- **Spring Boot 4.0.6** (Java 21)
- **PostgreSQL** (primary database)
- **Spring Security** with JWT tokens
- **Spring Data JPA** (Hibernate ORM)
- **Maven** (build & dependency management)

**Key Endpoints:**
- `POST /auth/register` - User registration
- `POST /auth/login` - Authentication (returns JWT token)
- `GET/POST /financial-profile` - Manage user financial information
- Integration with ML Service for risk profiling

### ML Service
- **FastAPI** (Python 3.10+, high-performance async API)
- **scikit-learn** (K-Means clustering for risk profiling)
- **yfinance** (Real-time stock & ETF data)
- **CoinGecko API** (Cryptocurrency data)
- **Alpha Vantage API** (Company fundamentals)

**Key Endpoints:**
- `POST /risk-profile` - ML-based risk profile prediction
- `POST /risk-selection` - Save user's risk choice
- `GET /api/market/stock/{ticker}` - Stock prices
- `GET /api/market/crypto/{coin}` - Crypto prices
- `GET /api/market/gold-silver` - Precious metals rates

---

## Project Architecture

```
Wealthio (Monorepo)
├── frontend/              # React + Vite SPA
│   ├── src/
│   │   ├── pages/         # Routes: Login, Register, Dashboard, RiskAssessment
│   │   ├── components/    # Reusable components & auth guards
│   │   ├── context/       # Auth context & state management
│   │   └── api/           # HTTP clients (authApi, profileApi, riskApi)
│   └── package.json
│
├── backend/               # Spring Boot monolith (Java 21)
│   ├── src/main/java/com/wealthio/
│   │   ├── controllers/   # REST endpoints (Auth, FinancialProfile)
│   │   ├── entities/      # JPA entities (User, FinancialProfile, Portfolio)
│   │   ├── repositories/  # Spring Data JPA repos
│   │   ├── services/      # Business logic layer
│   │   ├── security/      # JWT & Spring Security config
│   │   ├── dto/           # Request/Response DTOs
│   │   └── exceptions/    # Custom exception handling
│   ├── src/main/resources/
│   │   └── application.yaml  # Database & JWT configuration
│   ├── pom.xml
│   └── mvnw               # Maven wrapper (JDK 21)
│
├── backend/ml-service/    # FastAPI (Python ML service)
│   ├── main.py            # FastAPI app setup
│   ├── config.py          # Configuration & environment variables
│   ├── routers/           # API route handlers (risk.py, market.py)
│   ├── models/            # ML model definitions (risk_profiler.py)
│   ├── schemas/           # Pydantic request/response schemas
│   ├── services/          # Business logic (clustering, market_data, etc.)
│   ├── training/          # ML model training scripts
│   ├── requirements.txt   # Python dependencies
│   └── artifacts/         # JSON logs & trained models
│
└── pom.xml                # Parent Maven POM (multi-module)
```

---

## Prerequisites

Before running the project locally, ensure you have:

- **Java 21 JDK** ([download](https://www.oracle.com/java/technologies/downloads/#java21))
- **Node.js 18+** with npm ([download](https://nodejs.org))
- **Python 3.10+** with pip ([download](https://www.python.org/downloads/))
- **PostgreSQL 12+** ([download](https://www.postgresql.org/download))
- **Git** (for cloning the repo)
- **Optional API Keys**:
  - Alpha Vantage API key (for stock fundamentals) - [free tier](https://www.alphavantage.co/api/)

---

## Local Setup & Installation

### 1️⃣ Clone the Repository

```powershell
git clone <REPO_URL> D:\PROJECTS\Wealthio
Set-Location D:\PROJECTS\Wealthio
```

### 2️⃣ Database Setup (PostgreSQL)

Create a PostgreSQL database and note your credentials:

```sql
-- Connect to PostgreSQL and run:
CREATE DATABASE wealthio_db;
CREATE USER wealthio_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE wealthio_db TO wealthio_user;
```

### 3️⃣ Backend (Spring Boot) Setup

**Create `.env` file in `backend/` directory:**

```properties
DB_URL=jdbc:postgresql://localhost:5432/wealthio_db
DB_USERNAME=wealthio_user
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key_min_32_chars_recommended
JWT_EXPIRATION=86400000
```

**Build and run the backend:**

```powershell
# Navigate to backend directory
Set-Location D:\PROJECTS\Wealthio\backend

# Build with Maven
.\mvnw clean package

# Run the application
.\mvnw spring-boot:run
```

The backend will start on `http://localhost:8080`

**Run tests (optional):**
```powershell
.\mvnw test
```

---

### 4️⃣ ML Service (FastAPI) Setup

**Create `backend/ml-service/.env` file:**

```properties
PORT=8001
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_key_optional
```

**Install and run the ML service:**

```powershell
# Navigate to ml-service directory
Set-Location D:\PROJECTS\Wealthio\backend\ml-service

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Install dependencies
pip install -r requirements.txt

# Train the ML model (first time only, or when retraining)
python training/train_kmeans.py

# Start the FastAPI service
uvicorn main:app --reload --port 8001
```

The ML Service will start on `http://localhost:8001`

**API Documentation:** Visit `http://localhost:8001/docs` in your browser for interactive Swagger UI

---

### 5️⃣ Frontend (React + Vite) Setup

```powershell
# Navigate to frontend directory
Set-Location D:\PROJECTS\Wealthio\frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173` (or `http://localhost:5174`)

**Build for production (optional):**
```powershell
npm run build
npm run preview
```

---

## Running All Services Together (Quick Start Checklist)

To run the complete application locally:

1. **Terminal 1 - Backend (Java)**
   ```powershell
   cd D:\PROJECTS\Wealthio\backend
   .\mvnw spring-boot:run
   ```
   Runs on: `http://localhost:8080`

2. **Terminal 2 - ML Service (Python)**
   ```powershell
   cd D:\PROJECTS\Wealthio\backend\ml-service
   .\venv\Scripts\Activate.ps1
   uvicorn main:app --reload --port 8001
   ```
   Runs on: `http://localhost:8001`

3. **Terminal 3 - Frontend (React)**
   ```powershell
   cd D:\PROJECTS\Wealthio\frontend
   npm run dev
   ```
   Runs on: `http://localhost:5173`

Once all three services are running, visit `http://localhost:5173` in your browser and register a new account to begin!

---

## API Communication Flow

```
Frontend (React)
    ↓
    ├─→ Backend (Java) @ localhost:8080
    │      ├─ Authentication (Login/Register)
    │      ├─ User profiles
    │      └─ Portfolio management
    │
    └─→ ML Service (FastAPI) @ localhost:8001
           ├─ Risk profiling (K-Means)
           ├─ Market data (stocks, crypto)
           └─ Historical price analysis
```

---

## Common Issues & Troubleshooting

### Java Issues
- **Error: Java 21 not found**
  - Set `JAVA_HOME` environment variable to your JDK 21 installation
  - Verify: `java -version`

### Database Issues
- **Connection refused on port 5432**
  - Ensure PostgreSQL is running: `pg_isready`
  - Check credentials in `.env` match your setup

### Python Virtual Environment Issues
- **`pip install` fails after activating venv**
  - Deactivate and reactivate: `deactivate` then `.\venv\Scripts\Activate.ps1`
  - Try upgrading pip: `python -m pip install --upgrade pip`

### ML Model Not Found
- **"Run `python training/train_kmeans.py` to train the model"**
  - The K-Means model hasn't been trained yet
  - Run: `python D:\PROJECTS\Wealthio\backend\ml-service\training\train_kmeans.py`

### CORS Issues
- The ML Service is configured with CORS middleware to accept requests from:
  - `http://localhost:8080` (backend)
  - `http://localhost:3000`, `http://localhost:5173`, `http://localhost:5174` (frontend variations)

### Port Already in Use
- Change the port in respective configs:
  - **Backend**: Modify `application.yaml` or use `--server.port=8081`
  - **ML Service**: Modify `.env PORT` or use `--port 8002`
  - **Frontend**: Vite auto-detects available ports

---

## Development Notes

### Project Dependencies

**Key Backend Dependencies:**
- Spring Boot Starter Web, Security, Data JPA, Validation
- JWT (JJWT 0.11.5)
- PostgreSQL driver
- Lombok (annotations)

**Key ML Service Dependencies:**
- FastAPI, Uvicorn
- scikit-learn, pandas, numpy, joblib
- yfinance, requests, httpx
- pydantic-settings

**Key Frontend Dependencies:**
- React 19, React Router 7, Axios
- Tailwind CSS 4.3
- ESLint, Babel, TypeScript

### Environment Variables

**Backend (.env in `backend/`):**
```properties
DB_URL=jdbc:postgresql://localhost:5432/wealthio_db
DB_USERNAME=wealthio_user
DB_PASSWORD=secure_password
JWT_SECRET=long_random_secret_min_32_chars
JWT_EXPIRATION=86400000  # 24 hours in milliseconds
```

**ML Service (.env in `backend/ml-service/`):**
```properties
PORT=8001
ALPHA_VANTAGE_API_KEY=your_api_key_here  # Optional
```

### Git Ignore
The project respects these entries (do not commit):
- `ml-service/.env` and `backend/.env`
- `ml-service/venv/` and Python cache
- `frontend/node_modules/`
- `backend/target/` and Maven cache
- Large model files & data artifacts

---

## Next Steps

1. ✅ Set up all three services locally
2. 📝 Create a test user account via the frontend
3. 🎯 Take the risk assessment questionnaire
4. 📊 View personalized recommendations on the dashboard
5. 📈 Explore market data integration for stocks and crypto

---

## Contributing

When adding features:
- Keep TypeScript strict mode enabled (`tsconfig.json`)
- Run tests before committing (`.\mvnw test`)
- Lint frontend code: `npm run lint`
- Document new API endpoints in docstrings

---

## Support

For issues or questions about setup, check:
- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [React Documentation](https://react.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- PostgreSQL logs: `SHOW data_directory;` then check the `log/` folder

