# RecipeGenie 🍳

> **A Full-Stack Multimodal Generative AI Platform for Sustainable Domestic Food Management & Regional Culinary Automation.**  
> Built with a hand-crafted kitchen notebook design language, zero-waste expiry heuristics, and deep cultural grounding for Indian kitchens.

---

## 🌟 Overview & Key Capabilities

RecipeGenie bridges household organic waste mitigation (**UN SDG 12: Responsible Consumption and Production**) with modern generative AI:

1. **Multimodal Pantry Ingestion (Gemini Vision)**:
   - Upload or capture fridge shelves/countertops (`POST /detect-ingredients`).
   - Gemini Vision filters out bottles, plastic containers, and non-edible items, returning a clean, deduplicated list of raw ingredients converted into interactive paper sticker chips.

2. **Perishability-Aware Priority ("Use Soon")**:
   - Toggle the **"use soon"** flag on high-perishability ingredients (fresh paneer, leafy greens, curd).
   - Gemini prioritizes these items in high volumetric quantity and returns an estimated weight saved (`estimated_food_saved_grams`).

3. **Regional Indian Culinary Ontologies & Strict Diets**:
   - **Regional Styles**: Sindhi *(Kadhi, Tuk, Koki & Sai Bhaji)*, Punjabi, Maharashtrian *(Ghati / Malvani)*, Gujarati, South Indian, Bengali, Indo-Chinese, Italian, and Mexican.
   - **Special Diets**: Veg, Non-Veg, Vegan, **Jain** *(strictly no onion, garlic, or root vegetables)*, and **Vrat/Fasting** *(sendha namak only, no grains)*.
   - **Allergies**: Strict exclusion for nuts, dairy, and gluten.
   - **Authentic Utensils & Units**: Uses kadhai, tawa, pressure cooker, tadka pan, katoris, and teaspoons.

4. **Dynamic Contextual Substitutions ("Missing something?")**:
   - AI computes authentic desi substitutions for commonly missing ingredients (e.g., *"dahi -> malai + squeeze of fresh nimbu"*).

5. **Cryptographic Authentication & Multi-Tenant Isolation**:
   - Stateless **Bcrypt** password hashing + **PyJWT (HS256)** authentication.
   - Strict multi-tenancy: users only see and manage their own recipes, favorites, and consumption analytics. Cross-tenant access triggers a defensive **404 Not Found** (mitigating Horizontal Privilege Escalation).

6. **Tactile Kitchen Notebook Design System**:
   - Authentic paper parchment (`#F6F0E4`), ink-line borders, dashed inputs, characterful serif headings (*Fraunces*), clean body text (*DM Sans*), and handwritten annotations (*Caveat*).
   - Light (warm sunlit parchment) and Dark (slate blackboard) modes persisted in local storage.

---

## 🛠 Tech Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript | Type-safe, declarative single-page application |
| **Styling** | Tailwind CSS, Lucide Icons | Responsive kitchen-notebook theme without glassmorphism |
| **Typography** | Google Fonts (*Fraunces*, *DM Sans*, *Caveat*) | Hand-crafted cookbook typography |
| **Backend API**| Python 3.11+, FastAPI, Uvicorn | Asynchronous, high-throughput REST API |
| **Data Validation** | Pydantic v2 | Bidirectional request/response schema enforcement |
| **Database** | MySQL 8.0+ with SQLAlchemy 2.0+ & PyMySQL | Relational persistence with foreign keys and CASCADE rules |
| **AI / Vision** | Google Gemini API (`google-genai` SDK) | Multimodal pantry vision & structured JSON schema generation |
| **Security** | PyJWT, Passlib / Bcrypt | Stateless Bearer token verification and salted password hashing |

---

## 📁 Project Structure

```text
recipegenie/
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py              # FastAPI application, CORS middleware, lifespan events, /health
│   │   ├── database.py          # SQLAlchemy engine, SessionLocal, declarative base
│   │   ├── models.py            # Relational models: User, Recipe, Favorite
│   │   ├── schemas.py           # Pydantic v2 validation models & JSON response schemas
│   │   ├── auth.py              # Bcrypt password hashing, JWT creation & get_current_user dependency
│   │   ├── gemini_service.py    # Google GenAI SDK integration (structured recipes & vision)
│   │   └── routes.py            # API endpoints (/auth/*, /generate, /recipes, /favorites, /stats)
│   ├── .env                     # Local environment configuration (git ignored)
│   ├── .env.example             # Template environment variables
│   ├── requirements.txt         # Backend Python dependencies
│   └── schema.sql               # Relational MySQL DDL script
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx       # Notebook header with Chef indicator, auth links & dark mode toggle
│   │   │   ├── Footer.tsx       # Minimalist notebook footer
│   │   │   └── ProtectedRoute.tsx # Route guard preserving navigation state for unauthenticated users
│   │   ├── context/
│   │   │   ├── AuthContext.tsx  # JWT authentication state, login, register, logout & 401 recovery
│   │   │   ├── ThemeContext.tsx # Light/dark notebook state persisted in localStorage
│   │   │   └── ToastContext.tsx # Contextual notification system
│   │   ├── pages/
│   │   │   ├── GeneratePage.tsx # Core kitchen workstation: chips, photo upload, options, recipe card
│   │   │   ├── HistoryPage.tsx  # Pinned recipe index cards with modal inspection
│   │   │   ├── FavoritesPage.tsx# User's bookmarked recipes notebook
│   │   │   ├── LoginPage.tsx    # Sign-in portal with inline validation
│   │   │   └── RegisterPage.tsx # Registration portal for new chefs
│   │   ├── api.ts               # Centralized HTTP client with automatic Bearer token injection
│   │   ├── App.tsx              # Application route tree wrapped in Providers
│   │   ├── index.css            # Notebook paper styling, grain textures, typography rules
│   │   └── main.tsx             # React entry point
│   ├── package.json             # Frontend dependencies and scripts
│   ├── tailwind.config.js       # Custom kitchen notebook color tokens and font families
│   └── vite.config.ts           # Vite build configuration
├── RecipeGenie_Project_Demo_Script.pdf # Comprehensive 2-Person Technical Presentation Script
└── README.md
```

---

## 🗄 Database Architecture (MySQL)

Tables are automatically verified and initialized upon FastAPI startup. To manually inspect or execute the schema:

```sql
CREATE DATABASE IF NOT EXISTS recipegenie;
USE recipegenie;

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_email (email)
);

-- 2. Recipes Table (relational user link)
CREATE TABLE IF NOT EXISTS recipes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    ingredients JSON NOT NULL,
    steps JSON NOT NULL,
    calories INT,
    cooking_time INT,
    servings INT,
    cuisine VARCHAR(100),
    diet VARCHAR(50),
    allergies JSON,
    use_first JSON,
    estimated_food_saved_grams INT DEFAULT 0,
    substitutions JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_recipes_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- 3. Favorites Table (compound uniqueness per user)
CREATE TABLE IF NOT EXISTS favorites (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    recipe_id INT NOT NULL,
    saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_favorites_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    CONSTRAINT fk_favorites_recipe FOREIGN KEY (recipe_id) REFERENCES recipes (id) ON DELETE CASCADE,
    CONSTRAINT uq_user_recipe UNIQUE (user_id, recipe_id)
);
```

---

## ⚙️ Environment Configuration

Navigate to `backend/`:
```bash
cd backend
cp .env.example .env
```

Configure `backend/.env`:
```env
# Database connection
DATABASE_URL=mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/recipegenie

# Google Gemini API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# JWT Authentication
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRE_HOURS=24
```
*(Note: If `gemini-2.5-flash` is unavailable in your region/tier, the backend automatically falls back to `gemini-3-flash-preview`.)*

---

## 🚀 Running the System

### 1. Start the Backend API
```powershell
cd d:\genaimpr\backend
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```
- Health Check: `http://127.0.0.1:8000/health`
- Interactive OpenAPI Docs: `http://127.0.0.1:8000/docs`

### 2. Start the Frontend Application
In a separate terminal:
```powershell
cd d:\genaimpr\frontend
npm run dev
```
Open your browser at:
👉 **`http://localhost:5173`**

### 3. Production Build Verification
To ensure type-safety and bundle production readiness:
```powershell
cd d:\genaimpr\frontend
npm run build
```

---

## 🔌 API Endpoints Reference

| Method | Endpoint | Authorization | Request Body / Parameters | Description |
| :--- | :--- | :--- | :--- | :--- |
| **`GET`** | `/health` | Public | None | Service liveness probe (`{"status": "ok"}`) |
| **`POST`** | `/auth/register` | Public | `{ name, email, password }` | Register chef; returns JWT token + user profile |
| **`POST`** | `/auth/login` | Public | `{ email, password }` | Authenticate chef; returns JWT token + user profile |
| **`GET`** | `/auth/me` | Bearer Token | None | Returns authenticated user profile |
| **`POST`** | `/generate` | Bearer Token | `GenerateRequest` (JSON) | Generates structured recipe via Gemini and persists to MySQL |
| **`POST`** | `/detect-ingredients`| Bearer Token| `multipart/form-data` (`image` < 5MB) | Detects raw food ingredients from pantry photograph |
| **`GET`** | `/recipes` | Bearer Token | None | Returns user's generated recipes (newest first) |
| **`GET`** | `/recipes/{id}` | Bearer Token | `id: int` | Returns detailed recipe or **404** if not owned by user |
| **`GET`** | `/favorites` | Bearer Token | None | Returns user's bookmarked recipes |
| **`POST`** | `/favorites/{recipe_id}`| Bearer Token| `recipe_id: int` | Adds recipe to user's favorites notebook |
| **`DELETE`**| `/favorites/{recipe_id}`| Bearer Token| `recipe_id: int` | Removes recipe from user's favorites notebook |
| **`GET`** | `/stats` | Bearer Token | None | Returns `{ total_recipes, total_grams_saved, total_favorites }` |

---

## 🧪 End-to-End Evaluation Checklist

1. **Route Protection**:
   - Visit `http://localhost:5173/` directly without credentials; verify automated redirect to `/login`.
2. **Registration & Session**:
   - Register a new account (`gitesh@example.com`). Confirm immediate redirect to the workstation, header displaying `Chef Gitesh`, and local storage containing `recipegenie_token`.
3. **Pantry Vision**:
   - Click **"Upload fridge photo"**; upload grocery/vegetable imagery. Confirm real-time extraction into ingredient chips.
4. **Waste Heuristic & Regional Selection**:
   - Click **"use soon"** on an ingredient (red dot indicator appears). Select **Sindhi (Kadhi, Tuk, Koki & Sai Bhaji)** or **Jain** diet.
5. **Recipe Card & Substitutions**:
   - Click **"Cook something up"**. Confirm the impact badge (*"saves about X g"*), ruled prep checklist, and contextual substitutions (*"Missing something?"*).
6. **Multi-Tenant Isolation**:
   - Bookmark recipe with **"Keep this one"**. Verify presence in `/favorites` and `/history`.
   - Sign out and register User 2 (`rahul@example.com`). Confirm User 2's history and favorites are completely clean.

---

## 📄 Project Presentation & Demonstration Resources
- A formal, professional 2-speaker presentation script tailored for jury defense and evaluation panels is available in the root directory:  
  👉 **`RecipeGenie_Project_Demo_Script.pdf`**
