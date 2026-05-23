# Wealthio

Fintech platform for personal wealth management.

## Quickstart — clone and setup

Prerequisites:
- Java 21 (or compatible JDK)
- Git
- Node.js (18+) and npm
- Python 3.10+ and pip

Clone the repository:

```powershell
git clone <REPO_URL> D:\PROJECTS\Wealthio
Set-Location D:\PROJECTS\Wealthio
```

Follow these steps to run each part of the monorepo.

### Backend (Spring Boot)

The backend is a Spring Boot application using the Maven wrapper.

Build and run:

```powershell
# from project root
.\mvnw clean package
.\mvnw spring-boot:run
```

Run tests:

```powershell
.\mvnw test
```

Notes:
- The project uses Java 21 (see `pom.xml`). If your JAVA_HOME points to a different JDK, update it or install a matching JDK.

### ML Service (FastAPI)

The `ml-service` folder contains a minimal FastAPI service.

Setup and run (Windows PowerShell):

```powershell
Set-Location D:\PROJECTS\Wealthio\ml-service
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8001
```

Notes:
- The repository includes a `.env` placeholder. Add local secrets to `ml-service/.env` if needed but do not commit it.

### Frontend (Vite + React + Tailwind)

The `frontend` folder is a Vite React project. If it was scaffolded already, run:

```powershell
Set-Location D:\PROJECTS\Wealthio\frontend
npm install
npm run dev
```

If the frontend has not been scaffolded yet, create it (non-destructive option shown):

```powershell
# create into a new folder so you don't overwrite anything
Set-Location D:\PROJECTS\Wealthio
npm create vite@latest frontend-new -- --template react-ts
Set-Location D:\PROJECTS\Wealthio\frontend-new
npm install
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
npm run dev
```

Tailwind setup reminders:
- In `tailwind.config.js` set `content` to `["./index.html","./src/**/*.{js,jsx,ts,tsx}"]`.
- Add the Tailwind directives to `src/index.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## Repository notes
- Do not commit `ml-service/.env`, virtual environments, `frontend/node_modules`, or build artifacts. The root `.gitignore` contains entries for these.
- If you add large models or data, add patterns like `ml-service/*.pkl` and `ml-service/*.csv` to `.gitignore`.

If anything is unclear or you want me to add step-by-step run scripts for each part, tell me which platform (Windows/macOS/Linux) you or collaborators will use and I can add platform-specific instructions.

