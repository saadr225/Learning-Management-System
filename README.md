# LMS — Learning Management System

A full-stack, microservices-based video learning platform. Users can browse a video library, stream content, and manage a personal watchlist. Admins get a dedicated dashboard to manage users, upload videos directly to S3, and publish/unpublish content — all without the backend ever touching video bytes.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│       (TypeScript · Tailwind CSS v4 · React Player)      │
└────────────────────────────┬────────────────────────────┘
                             │ HTTP (port 80)
                    ┌────────▼────────┐
                    │    HAProxy 2.8   │  ← API Gateway
                    │   (port 80/8404) │
                    └───┬───┬───┬───┬─┘
          /api/auth ────┘   │   │   └──── /api/admin
          /api/videos ──────┘   └──────── /api/watchlist
               │                 │              │
      ┌────────▼──────┐  ┌──────▼──────┐  ┌───▼───────────┐
      │  Auth Service │  │Video Service│  │Watchlist Svc  │
      │   :5001       │  │   :5002     │  │    :5003      │
      └────────┬──────┘  └──────┬──────┘  └───────────────┘
               │                │
          MongoDB Atlas     MongoDB Atlas
          (lms_auth)        (lms_videos)
                                │
                             AWS S3
                      (video files & thumbnails)
                                        ┌──────────────────┐
                                        │  Admin Service   │
                                        │     :5004        │
                                        └──────────────────┘
                                         (reads auth + video DBs
                                          proxies writes to video svc)
```

All containers communicate over a shared Docker bridge network (`lms-network`). HAProxy is the **only** container with host-exposed ports — all microservices and the frontend are internal. Services authenticate via JWT; tokens are verified locally without cross-service calls.

---

## Services

### Auth Service (`/services/auth-service`) — port 5001

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/auth/register` | POST | — | Register a new user (`role: user` or `admin`) |
| `/auth/login` | POST | — | Login, returns access + refresh tokens |
| `/auth/refresh` | POST | — | Exchange a refresh token for a new access token |
| `/auth/me` | GET | User | Return the authenticated user's profile |
| `/health` | GET | — | Health check for Docker/HAProxy |

- Passwords hashed with **bcrypt**
- **Access tokens** expire in 15 minutes; **refresh tokens** in 7 days
- MongoDB collection: `lms_auth.users`

---

### Video Service (`/services/video-service`) — port 5002

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/videos` | GET | — | List published videos (search, tag filter, pagination) |
| `/videos/:id` | GET | — | Get a single video |
| `/videos` | POST | Admin | Create a video metadata record |
| `/videos/:id` | PATCH | Admin | Update metadata / publish or unpublish |
| `/videos/:id` | DELETE | Admin | Delete video and its S3 files |
| `/videos/:id/upload-url` | POST | Admin | Get a presigned S3 PUT URL (15 min) |
| `/videos/:id/thumbnail-upload-url` | POST | Admin | Get a presigned S3 PUT URL for thumbnail |
| `/videos/:id/stream-url` | GET | User | Get a presigned S3 GET URL (1 hour) |
| `/health` | GET | — | Health check for Docker/HAProxy |

- Videos are uploaded **directly from the browser to S3** via presigned URLs — the service never handles video bytes
- Full-text search index on `title` and `description`
- MongoDB collection: `lms_videos.videos`
- S3 bucket: `lms-videos-bucket-657306716880-eu-north-1-an` (region: `eu-north-1` using explicit `s3v4` endpoints to satisfy AWS strict regional routing rules)

---

### Watchlist Service (`/services/watchlist-service`) — port 5003

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/watchlist` | GET | User | Get the user's watchlist (enriched with video metadata) |
| `/watchlist` | POST | User | Add a video to the watchlist |
| `/watchlist/:video_id` | DELETE | User | Remove a video from the watchlist |
| `/watchlist/check/:video_id` | GET | User | Check if a video is in the watchlist |
| `/health` | GET | — | Health check for Docker/HAProxy |

- Compound index on `(user_id, video_id)` enforces uniqueness and makes lookups fast
- Enriches each entry by calling the video service internally via `VIDEO_SERVICE_URL`
- MongoDB collection: `lms_watchlist.watchlist`

---

### Admin Service (`/services/admin-service`) — port 5004

All admin endpoints require a valid JWT with `role: admin`.

| Endpoint | Method | Description |
|---|---|---|
| `/admin/dashboard` | GET | Returns total users, total videos, published count, draft count |
| `/admin/users` | GET | List all registered users (password hashes excluded) |
| `/admin/videos` | GET | List **all** videos including unpublished drafts |
| `/admin/videos` | POST | Create a new video record (proxied to video service) |
| `/admin/videos/:id/upload-url` | POST | Get a presigned upload URL (proxied to video service) |
| `/admin/videos/:id` | PATCH | Update video metadata or publish/unpublish (proxied) |
| `/admin/videos/:id` | DELETE | Delete a video and its S3 assets (proxied) |
| `/health` | GET | Health check for Docker/HAProxy |

- Reads directly from both `lms_auth` and `lms_videos` MongoDB databases
- Write operations (create, update, delete, upload) are **proxied** to the Video Service to keep business logic centralized
- Has the `/auth/register` API mapped to allow Admins to securely add new Admins directly from the admin panel.

---

## HAProxy API Gateway (`/haproxy`)

HAProxy 2.8 acts as the single entry point for all traffic.

| Port | Purpose |
|---|---|
| `80` | HTTP traffic — routes to microservices or React frontend |
| `8404` | HAProxy stats dashboard (`/stats`) |

**Path-based routing rules:**

| URL Prefix | Backend |
|---|---|
| `/api/auth/*` | `auth-service:5001` |
| `/api/videos/*` | `video-service:5002` |
| `/api/watchlist/*` | `watchlist-service:5003` |
| `/api/admin/*` | `admin-service:5004` |
| everything else | React frontend (`frontend:3000`) |

HAProxy **strips the `/api/<prefix>`** before forwarding, so Flask services see clean paths like `/auth/login`, `/videos`, etc.

---

## Frontend (`/frontend`)

Built with **React 19 + TypeScript + Tailwind CSS v4 + React Router v7**.

### Pages & Routes

| Route | Page | Auth Required | Role |
|---|---|---|---|
| `/login` | Login | No | — |
| `/register` | Register | No | — |
| `/library` | Video library with search & tag filter | Yes | User |
| `/player/:id` | Video player with watchlist toggle | Yes | User |
| `/watchlist` | Personal watchlist | Yes | User |
| `/admin` | Admin dashboard (users, videos, upload) | Yes | Admin |

### Key Components

| Component | Description |
|---|---|
| `Navbar` | Navigation with auth state & role-aware admin link |
| `VideoCard` | Thumbnail card with title, tags, and duration |
| `PrivateRoute` | Redirects unauthenticated users to `/login` |
| `AdminRoute` | Redirects non-admin users away from `/admin` |

The entire frontend UI uses a unified, modern style system emphasizing slate grays, soft blues, rounded borders, and clean typography. The Admin dashboard can dynamically extract video duration times directly from HTML5 file metadata in the browser before dispatching it to S3/backend.

### API Layer (`/frontend/src/api`)

| File | Wraps |
|---|---|
| `auth.ts` | `/api/auth/*` — register, login, refresh, me |
| `videos.ts` | `/api/videos/*` — list, get, stream URL |
| `watchlist.ts` | `/api/watchlist/*` — get, add, remove, check |
| `admin.ts` | `/api/admin/*` — dashboard, users, video CRUD, upload URL |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS v4, React Router v7, React Player, Axios |
| Backend | Python 3.11, Flask, PyMongo, PyJWT, bcrypt, Flask-CORS, boto3 |
| Database | MongoDB Atlas (3 separate databases) |
| Storage | AWS S3 (pre-signed URLs — direct browser upload/stream. Signature Version `s3v4` configured for `eu-north-1`) |
| API Gateway | HAProxy 2.8 (path-based routing, health checks, stats) |
| Containers | Docker + Docker Compose v3.9 |
| Memory limits | Node `--max-old-space-size=4096` configured for frontend builds |
| CI/CD | GitLab CI/CD (lint → deploy to AWS EC2) |

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A **MongoDB Atlas** cluster (or local MongoDB instance)
- An **AWS S3 bucket** and IAM credentials with `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject`

### 1. Clone the Repository

```bash
git clone https://gitlab.com/<your-username>/lms.git
cd lms
```

### 2. Configure Environment Variables

Create a `.env` file in the project root (Docker Compose reads it automatically):

```env
# ── Shared secrets ────────────────────────────────────────────────────────────
JWT_SECRET=your-super-secret-jwt-key
JWT_REFRESH_SECRET=your-super-secret-refresh-key

# ── MongoDB Atlas URIs ────────────────────────────────────────────────────────
AUTH_MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/lms_auth?retryWrites=true&w=majority
VIDEO_MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/lms_videos?retryWrites=true&w=majority
WATCHLIST_MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>/lms_watchlist?retryWrites=true&w=majority

# ── AWS S3 ────────────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID=your-iam-access-key
AWS_SECRET_ACCESS_KEY=your-iam-secret-key
AWS_S3_BUCKET=your-s3-bucket-name
AWS_REGION=eu-north-1

# ── Inter-service URLs (Docker service names, not localhost) ──────────────────
VIDEO_SERVICE_URL=http://video-service:5002
```

> **Note:** Never commit the `.env` file. It is already listed in `.gitignore`.

### 3. Run with Docker Compose

```bash
docker compose up --build
```

Docker Compose will:
1. Build all 5 images (auth, video, watchlist, admin, haproxy + frontend)
2. Wait for all microservices to pass their `/health` checks before starting HAProxy
3. Expose the app on **port 80** and the HAProxy stats dashboard on **port 8404**

| URL | What you see |
|---|---|
| `http://localhost` | React application |
| `http://localhost/api/auth/...` | Auth microservice |
| `http://localhost/api/videos/...` | Video microservice |
| `http://localhost/api/watchlist/...` | Watchlist microservice |
| `http://localhost/api/admin/...` | Admin microservice |
| `http://localhost:8404/stats` | HAProxy stats dashboard |

### 4. Create an Admin User

Register via the UI (or directly call the API), then update the user's role in MongoDB Atlas:

```javascript
// In MongoDB Atlas → Collections → lms_auth → users
db.users.updateOne({ email: "admin@example.com" }, { $set: { role: "admin" } })
```

---

## CI/CD Pipeline

The project uses **GitLab CI/CD** with two stages defined in `.gitlab-ci.yml`:

### Stage 1 — `test` (runs on every push & merge request)

| Job | What it does |
|---|---|
| `lint-auth` | Installs deps, runs `flake8` on the auth service |
| `lint-video` | Installs deps, runs `flake8` on the video service |
| `lint-watchlist` | Installs deps, runs `flake8` on the watchlist service |
| `lint-admin` | Installs deps, runs `flake8` on the admin service |
| `lint-frontend` | Runs `npm ci` then `tsc --noEmit` for TypeScript type-checking |

### Stage 2 — `deploy` (runs only on `main` branch)

| Job | What it does |
|---|---|
| `deploy-to-ec2` | SSHes into an AWS EC2 instance, writes `.env` from CI variables, pulls latest code, and runs `docker compose up -d --build` |

### Required GitLab CI/CD Variables

Set these in **Settings → CI/CD → Variables** on your GitLab project:

| Variable | Description |
|---|---|
| `JWT_SECRET` | JWT signing secret |
| `JWT_REFRESH_SECRET` | JWT refresh token secret |
| `AUTH_MONGO_URI` | MongoDB Atlas URI for `lms_auth` |
| `VIDEO_MONGO_URI` | MongoDB Atlas URI for `lms_videos` |
| `WATCHLIST_MONGO_URI` | MongoDB Atlas URI for `lms_watchlist` |
| `AWS_ACCESS_KEY_ID` | IAM access key |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_S3_BUCKET` | S3 bucket name |
| `AWS_REGION` | AWS region (e.g. `eu-north-1`) |
| `EC2_HOST` | EC2 public IP or domain name |
| `EC2_USER` | EC2 SSH user (e.g. `ubuntu`) |
| `EC2_SSH_KEY` | Contents of the EC2 `.pem` private key file |

> **Note:** Mark `JWT_SECRET`, `JWT_REFRESH_SECRET`, `AWS_SECRET_ACCESS_KEY`, and `EC2_SSH_KEY` as **Masked** in GitLab to prevent them from appearing in pipeline logs.

---

## Project Structure

```
LMS/
├── .env                          # Root env file (read by Docker Compose)
├── .gitignore
├── .gitlab-ci.yml                # GitLab CI/CD pipeline (lint + EC2 deploy)
├── docker-compose.yml            # Orchestrates all 6 containers
│
├── haproxy/
│   ├── Dockerfile                # FROM haproxy:2.8-alpine
│   └── haproxy.cfg               # Path-based routing, health checks, stats
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── api/                  # Axios wrappers (auth, videos, watchlist, admin)
│       ├── components/           # Navbar, VideoCard, PrivateRoute, AdminRoute
│       ├── context/              # AuthContext (JWT storage & silent refresh)
│       └── pages/                # LoginPage, RegisterPage, LibraryPage,
│                                 # PlayerPage, WatchlistPage, AdminPage
│
└── services/
    ├── auth-service/             # Flask — register, login, JWT issue/refresh
    │   ├── Dockerfile
    │   ├── app.py
    │   ├── models/
    │   └── routes/
    ├── video-service/            # Flask — video CRUD, S3 presigned URLs
    │   ├── Dockerfile
    │   ├── app.py
    │   ├── models/
    │   └── routes/
    ├── watchlist-service/        # Flask — user watchlist management
    │   ├── Dockerfile
    │   ├── app.py
    │   ├── models/
    │   └── routes/
    └── admin-service/            # Flask — admin dashboard, user/video mgmt
        ├── Dockerfile
        ├── app.py
        ├── models/
        └── routes/
```

---

## Security Notes

- All microservice ports are **internal only** — only HAProxy is exposed to the host
- JWT secrets are shared across services but never sent over the network; validation is purely local
- S3 presigned URLs expire: **15 minutes** for uploads, **1 hour** for streaming
- Admin endpoints are double-protected: `require_auth` (valid JWT) + `require_admin` (role check)
- CORS is enabled on all Flask services via `flask-cors`

---

## License

MIT
