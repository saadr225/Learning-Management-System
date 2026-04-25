# LMS — Learning Management System

A full-stack, microservices video learning platform. Users can browse a video library, stream content, and manage a personal watchlist. Admins upload and publish videos directly to S3 without the backend ever touching the video bytes.

## Architecture

```
┌─────────────────────────────────────────┐
│           React Frontend                │
│  (TypeScript · Tailwind · React Player) │
└────────────┬────────────────────────────┘
             │ HTTP / JWT
     ┌───────┼───────────────┐
     ▼       ▼               ▼
┌─────────┐ ┌─────────────┐ ┌──────────────────┐
│  Auth   │ │   Video     │ │    Watchlist     │
│ Service │ │  Service    │ │    Service       │
│ :5001   │ │  :5002      │ │    :5003         │
└────┬────┘ └──────┬──────┘ └────────┬─────────┘
     │             │                 │
     └──────┬──────┘                 │
            ▼                        ▼
        MongoDB                  MongoDB
                      │
                      ▼
                   AWS S3
              (video files &
               thumbnails)
```

Each service is independently deployable via Docker. Services share a JWT secret — tokens are verified locally without cross-service calls.

## Services

### Auth Service (`/services/auth-service`) — port 5001

| Endpoint | Method | Description |
|---|---|---|
| `/auth/register` | POST | Register a new user (role: `user` or `admin`) |
| `/auth/login` | POST | Login, returns access + refresh tokens |
| `/auth/refresh` | POST | Exchange a refresh token for a new access token |
| `/auth/me` | GET | Return the authenticated user's profile |

- Passwords hashed with **bcrypt**
- **Access tokens** expire in 15 minutes; **refresh tokens** in 7 days

### Video Service (`/services/video-service`) — port 5002

| Endpoint | Method | Auth | Description |
|---|---|---|---|
| `/videos` | GET | — | List published videos (search, tag filter, pagination) |
| `/videos/:id` | GET | — | Get a single video |
| `/videos` | POST | Admin | Create a video metadata record |
| `/videos/:id` | PATCH | Admin | Update metadata / publish/unpublish |
| `/videos/:id` | DELETE | Admin | Delete video and its S3 files |
| `/videos/:id/upload-url` | POST | Admin | Get a presigned S3 PUT URL (15 min) |
| `/videos/:id/thumbnail-upload-url` | POST | Admin | Get a presigned S3 PUT URL for thumbnail |
| `/videos/:id/stream-url` | GET | User | Get a presigned S3 GET URL (1 hour) |

- Videos are uploaded **directly from the browser to S3** — the service never handles video bytes
- Full-text search index on `title` and `description`

### Watchlist Service (`/services/watchlist-service`) — port 5003

| Endpoint | Method | Description |
|---|---|---|
| `/watchlist` | GET | Get the user's watchlist (enriched with video metadata) |
| `/watchlist` | POST | Add a video to the watchlist |
| `/watchlist/:video_id` | DELETE | Remove a video from the watchlist |
| `/watchlist/check/:video_id` | GET | Check if a video is in the watchlist |

- Compound index on `(user_id, video_id)` enforces uniqueness and makes lookups fast
- Enriches each entry by calling the video service internally

## Frontend (`/frontend`)

Built with **React 19 + TypeScript + Tailwind CSS v4 + React Router v7**.

| Route | Page | Auth Required |
|---|---|---|
| `/login` | Login | No |
| `/register` | Register | No |
| `/library` | Video library with search & tags | Yes |
| `/player/:id` | Video player | Yes |
| `/watchlist` | Personal watchlist | Yes |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Tailwind CSS, React Router, React Player, Axios |
| Backend | Python 3.11, Flask, PyMongo, PyJWT, bcrypt |
| Database | MongoDB |
| Storage | AWS S3 (presigned URLs) |
| Containers | Docker |

## Getting Started

### Prerequisites

- Docker
- MongoDB instance (local or Atlas)
- AWS S3 bucket

### Environment Variables

Each service reads from a `.env` file.

**Auth Service**
```env
MONGO_URI=mongodb://...
JWT_SECRET=your-secret
JWT_REFRESH_SECRET=your-refresh-secret
PORT=5001
```

**Video Service**
```env
MONGO_URI=mongodb://...
JWT_SECRET=your-secret
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_S3_BUCKET=your-bucket
PORT=5002
```

**Watchlist Service**
```env
MONGO_URI=mongodb://...
JWT_SECRET=your-secret
VIDEO_SERVICE_URL=http://video-service:5002
PORT=5003
```

### Running with Docker

```bash
# Build each service
docker build -t lms-auth     ./services/auth-service
docker build -t lms-video    ./services/video-service
docker build -t lms-watchlist ./services/watchlist-service

# Run each service
docker run -p 5001:5001 --env-file services/auth-service/.env     lms-auth
docker run -p 5002:5002 --env-file services/video-service/.env    lms-video
docker run -p 5003:5003 --env-file services/watchlist-service/.env lms-watchlist
```

### Running the Frontend

```bash
cd frontend
npm install
npm start
```

The app will be available at `http://localhost:3000`.

## Project Structure

```
LMS/
├── frontend/
│   └── src/
│       ├── api/          # Axios wrappers (auth, videos, watchlist)
│       ├── components/   # Navbar, VideoCard, PrivateRoute
│       ├── context/      # AuthContext (JWT storage & refresh logic)
│       └── pages/        # LoginPage, RegisterPage, LibraryPage, PlayerPage, WatchlistPage
└── services/
    ├── auth-service/
    ├── video-service/
    └── watchlist-service/
```
