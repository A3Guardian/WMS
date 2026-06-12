# WMS — Warehouse Management System

A full-stack warehouse management platform for inventory, orders, employees, finance, and biometric access control.

**Backend:** Laravel 12 (PHP 8.2), MySQL, Laravel Sanctum, Spatie Permissions  
**Frontend:** React 19, Vite 7, Tailwind CSS 4, React Query, i18n (EN/RO)

---

## Features

- **Warehouse:** products, inventory, deposits (shelf layout), orders, suppliers, customers
- **Operations:** tasks, employee dashboards
- **HR & finance:** departments, employees, salaries, leave, attendance, payroll, invoices, payments, cost reports
- **Administration:** users, roles, permissions, application settings
- **Biometrics:** device management and event logging (requires the separate `wms-fingerprint-service` running on hardware such as a Raspberry Pi)

---

## Prerequisites

| Tool | Version |
|------|---------|
| Docker & Docker Compose | latest |
| PHP | 8.2+ (local setup only) |
| Composer | 2.x (local setup only) |
| Node.js | 20+ (local setup only) |
| MySQL | 8.0 (local setup only) |

---

## Quick start (Docker — recommended)

### 1. Clone and configure environment

```bash
git clone <repository-url> wms
cd wms
cp .env.example .env
```

Edit `.env` for Docker:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=mysql
DB_PORT=3306
DB_DATABASE=wms
DB_USERNAME=root
DB_PASSWORD=root
```

Generate the application key (once):

```bash
# If PHP is installed locally:
php artisan key:generate

# Or inside the container after the first start:
docker exec wms_app php artisan key:generate
```

### 2. Start the stack

```bash
docker compose up --build
```

This starts:

| Service | Container | Ports | Description |
|---------|-----------|-------|-------------|
| App | `wms_app` | `8000`, `5173` | Laravel API + Vite dev server |
| MySQL | `wms_mysql` | `3307` → `3306` | Database |

On startup the app container automatically runs migrations. **Seed the database** to create users and demo data:

```bash
docker exec wms_app php artisan db:seed
```

### 3. Open the application

| URL | Purpose |
|-----|---------|
| http://localhost:8000 | Web application (login page) |
| http://localhost:5173 | Vite dev server (HMR; used internally by Laravel) |

---

## Local development (without Docker)

### 1. Install dependencies

```bash
composer install
cp .env.example .env
php artisan key:generate
```

Configure `.env` for a local MySQL instance:

```env
APP_URL=http://localhost:8000

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=wms
DB_USERNAME=root
DB_PASSWORD=your_password
```

```bash
npm install
php artisan migrate
php artisan db:seed
```

### 2. Run all services

```bash
composer dev
```

This starts Laravel (`:8000`), the queue worker, log tailing, and Vite (`:5173`) in parallel.

Alternatively, run them in separate terminals:

```bash
php artisan serve
php artisan queue:listen
npm run dev
```

### 3. Production build

```bash
npm run build
```

---

## Default login credentials

All seeded accounts use the password **`password`**.

### Primary accounts (`UserSeeder`)

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@wms.com` | `password` |
| Employee | `employee@wms.com` | `password` |
| Financial | `financial@wms.com` | `password` |

### Additional demo accounts (`DemoDataSeeder`)

| Role | Emails |
|------|--------|
| Admin | `admin1@wms.com`, `admin2@wms.com`, `admin3@wms.com` |
| Employee | `employee1@wms.com`, `employee2@wms.com`, `employee3@wms.com` |
| Financial | `financial1@wms.com`, `financial2@wms.com`, `financial3@wms.com` |

Password for all: **`password`**

> Use the **Admin** account for full access (user/role management, settings, biometrics).

---

## Database credentials (Docker)

| Setting | Value |
|---------|-------|
| Host (from host machine) | `127.0.0.1` |
| Port (from host machine) | `3307` |
| Host (from app container) | `mysql` |
| Port (from app container) | `3306` |
| Database | `wms` |
| Username | `root` |
| Password | `root` |

---

## Project structure

```
wms/
├── app/                  # Laravel backend (controllers, models, services)
├── database/
│   ├── migrations/       # Schema
│   └── seeders/          # Roles, users, demo data
├── resources/
│   ├── js/               # React SPA (pages, components, API client)
│   └── css/              # Tailwind entry
├── routes/
│   ├── api.php           # REST API (Sanctum-protected)
│   └── web.php           # SPA fallback
├── docker-compose.yml    # Dev environment (app + MySQL)
├── Dockerfile.dev        # PHP 8.2 + Node 20 image
└── vite.config.js        # Vite + React + Laravel plugin
```

---

## Biometric integration

Fingerprint scanning is handled by a **separate FastAPI service** (`wms-fingerprint-service`), deployed on edge hardware (e.g. Raspberry Pi). WMS communicates with it over HTTP using the `service_url` configured per biometric device in the admin panel.

The fingerprint service is not part of the Docker stack. See its own README for setup and deployment.

---

## Useful commands

```bash
# Reset and reseed database
php artisan migrate:fresh --seed

# Run tests
composer test

# Clear caches
php artisan config:clear && php artisan cache:clear

# Docker: view app logs
docker logs -f wms_app

# Docker: run artisan inside container
docker exec wms_app php artisan <command>
```

---

## Troubleshooting

**Blank page or assets not loading**  
Ensure Vite is running (`npm run dev` or the Docker stack is up). `APP_URL` must match `http://localhost:8000`.

**Database connection refused (Docker)**  
Wait for the MySQL health check to pass before the app starts. Check with `docker compose ps`.

**Cannot log in after first start**  
Run `php artisan db:seed` — migrations alone do not create users.

**Port already in use**  
Change mapped ports in `docker-compose.yml` or stop conflicting services on `8000`, `5173`, or `3307`.

---

## License

MIT
