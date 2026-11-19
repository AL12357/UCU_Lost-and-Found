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

### 2. Install and start the application
1. From the project root (the folder containing `backend/` and `frontend/`), install
   dependencies once:
   ```bash
   npm install
   ```
2. Copy `backend/.env.example` to `backend/.env`. The defaults match a typical XAMPP
   install (`127.0.0.1:3306`, user `root`, no password); update these if you changed
   your MySQL port or root password.
3. Start both the API and frontend together:
   ```bash
   npm run dev
   ```
   The frontend opens at `http://localhost:5173`; Vite forwards API requests to the
   backend at `http://localhost:5000`. Keep this terminal open while using the app.
4. Open `http://localhost:5000/api/health`. A successful connection returns
   `{"status":"ok","database":"connected"}`. If it reports a database error, make
   sure XAMPP MySQL is running and the `.env` values match your XAMPP settings.
5. Initialize the demo account passwords (`Password123!`) via:
   ```bash
   curl -X POST http://localhost:5000/api/seed-passwords
   ```

### 3. Frontend access
1. Open the local Vite URL shown in your terminal (typically `http://localhost:5173`).
   Vite forwards `/api` and `/uploads` requests to the backend at `http://localhost:5000`.
   Vite listens on all network interfaces, so a phone on the same Wi-Fi network can open
   `http://<computer-IP>:5173` (for example, `http://192.168.1.20:5173`). Find the computer
   IP with `ipconfig` and allow Node/Vite through Windows Defender Firewall if prompted.
   To use another backend address in development, copy `frontend/.env.example` to
   `frontend/.env` and set `BACKEND_URL`.

### 4. Deploy publicly with Render
The included `render.yaml` deploys the frontend and API together on one public URL.
You will need a Render account, a hosted MySQL database that accepts connections from
Render, and to push this project to your Git hosting provider.

1. Create a hosted MySQL database. Create the database named in its connection details
   (or use the provider-assigned name) and make sure its network rules allow connections
   from Render.
2. In your Git provider, push this project, then in Render create a new Blueprint from
   that repository and apply `render.yaml`.
3. During setup, enter the MySQL connection values for `DB_HOST`, `DB_USER`,
   `DB_PASSWORD`, and `DB_NAME`. Render generates a `JWT_SECRET`; do not replace it
   with the local example value.
4. Before the app is used, select the hosted database and run only the three `CREATE
   TABLE` statements from `database/schema_and_seed.sql`. Skip its `CREATE DATABASE`,
   `USE`, and demo `INSERT` statements. Those inserts include publicly documented demo
   accounts. Create your own account through the app, then promote the intended
   administrator account directly in the database, for example:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'your-admin-email@example.com';
   ```
5. Wait for the Render service's health check to pass, then open its public `onrender.com`
   URL. The uploaded-image disk is persistent across app restarts.

The Render web service and its persistent disk may require a paid plan. The MySQL
database is hosted separately and may have its own cost. The local demo-password
endpoint is disabled automatically when `NODE_ENV=production`.

## Demo Accounts (Password: `Password123!`)
These accounts are for local development only. Do not seed them into the public database.
- **Administrator:** `admin@ucu.ac.ug`
- **Student (Okello):** `okello@students.ucu.ac.ug`
- **Student (Namusoke):** `namusoke@students.ucu.ac.ug`
