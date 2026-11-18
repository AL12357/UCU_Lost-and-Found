# UCU Campus Lost and Found System (CSC1202)

A full-stack responsive web application built for Uganda Christian University (Mukono Campus) using **React**, **Node.js / Express**, and **MySQL (XAMPP)**.

## Project Structure
- `database/schema_and_seed.sql` - MySQL database schema and fictional sample data.
- `backend/` - Express REST API with JWT authentication, role-based access control, and Multer image uploads.
- `frontend/` - Responsive React + Tailwind CSS user interface.

## Setup Instructions

### 1. Database Setup (XAMPP)
1. Start **MySQL** in the XAMPP Control Panel. Apache is only needed if you want to open phpMyAdmin through XAMPP.
2. Open `http://localhost/phpmyadmin`, go to the **SQL** tab, and execute `database/schema_and_seed.sql`.
   This creates the `ucu_lost_found` database and its tables.

### 2. Backend Setup
1. Navigate to `backend/`:
   ```bash
   cd backend
   npm install
   ```
2. Copy `backend/.env.example` to `backend/.env`. The defaults match a typical XAMPP
   install (`127.0.0.1:3306`, user `root`, no password); update these if you changed
   your MySQL port or root password.
3. Start the API server:
   ```bash
   npm start
   ```
4. Open `http://localhost:5000/api/health`. A successful connection returns
   `{"status":"ok","database":"connected"}`. If it reports a database error, make
   sure XAMPP MySQL is running and the `.env` values match your XAMPP settings.
5. Initialize the demo account passwords (`Password123!`) via:
   ```bash
   curl -X POST http://localhost:5000/api/seed-passwords
   ```

### 3. Frontend Setup
1. Open a new terminal in `frontend/`:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
2. Open the local Vite URL shown in your terminal (typically `http://localhost:5173`).
   Vite forwards `/api` and `/uploads` requests to the backend at `http://localhost:5000`.
   To use another backend address in development, copy `frontend/.env.example` to
   `frontend/.env` and set `BACKEND_URL`.

### 4. Production
1. Build the frontend:
   ```bash
   cd frontend
   npm run build
   ```
2. Start the backend with `npm start` from `backend/`. It serves the built frontend
   and API from the same origin; the production app uses relative `/api` and `/uploads`
   URLs, so it does not depend on localhost.
3. Configure the backend's `.env` with the production database connection and a
   private `JWT_SECRET`. Keep the database and uploaded files on persistent storage.

If you host the frontend and backend on different origins, set `VITE_API_URL` in the
frontend build environment to the backend API URL (for example,
`https://your-backend.example.com/api`). The backend must allow the frontend origin
through CORS.

## Demo Accounts (Password: `Password123!`)
- **Administrator:** `admin@ucu.ac.ug`
- **Student (Okello):** `okello@students.ucu.ac.ug`
- **Student (Namusoke):** `namusoke@students.ucu.ac.ug`
