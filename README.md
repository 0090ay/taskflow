# TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, project management, task tracking, and a real-time dashboard.

---

## Features

- **Authentication** — JWT-based signup/login with role selection (Admin/Member)
- **Projects** — Create, view, archive projects; manage team membership
- **Tasks** — Create/assign/track tasks with status (To Do / In Progress / Done), priority, due dates
- **Kanban Board** — Visual board view per project
- **Dashboard** — Stats overview, my tasks, overdue alerts, project progress
- **Role-Based Access Control**
  - **Global Admin**: full access to all projects, users, and tasks
  - **Project Admin**: can manage tasks and members within their project
  - **Member**: can view/update assigned tasks
- **User Management** — Admin panel to promote/demote users

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 18, React Router v6, Vite     |
| Backend   | Node.js, Express                    |
| Database  | SQLite via better-sqlite3           |
| Auth      | JWT + bcryptjs                      |
| Validation| express-validator                   |
| Styling   | Custom CSS (no frameworks)          |

---

## Project Structure

```
taskflow/
├── backend/
│   ├── db/database.js        # SQLite setup & schema
│   ├── middleware/auth.js    # JWT + RBAC middleware
│   ├── routes/
│   │   ├── auth.js           # POST /signup, /login, GET /me
│   │   ├── projects.js       # CRUD + member management
│   │   ├── tasks.js          # CRUD per project
│   │   └── dashboard.js      # Aggregated stats + user listing
│   └── server.js             # Express entry point
├── frontend/
│   ├── src/
│   │   ├── api.js            # Axios instance + interceptors
│   │   ├── context/AuthContext.jsx
│   │   ├── components/Sidebar.jsx
│   │   └── pages/
│   │       ├── AuthPage.jsx
│   │       ├── Dashboard.jsx
│   │       ├── Projects.jsx
│   │       ├── ProjectDetail.jsx
│   │       └── OtherPages.jsx  # MyTasks + UsersAdmin
│   └── index.html
├── railway.toml
├── nixpacks.toml
└── .env.example
```

---

## REST API Endpoints

### Auth
| Method | Path             | Access | Description          |
|--------|------------------|--------|----------------------|
| POST   | /api/auth/signup | Public | Register new user    |
| POST   | /api/auth/login  | Public | Login, get JWT       |
| GET    | /api/auth/me     | Auth   | Get current user     |

### Projects
| Method | Path                            | Access         | Description         |
|--------|---------------------------------|----------------|---------------------|
| GET    | /api/projects                   | Auth           | List my projects    |
| POST   | /api/projects                   | Auth           | Create project      |
| GET    | /api/projects/:id               | Member         | Project + members   |
| PUT    | /api/projects/:id               | Project Admin  | Update project      |
| DELETE | /api/projects/:id               | Project Admin  | Delete project      |
| POST   | /api/projects/:id/members       | Project Admin  | Add member          |
| DELETE | /api/projects/:id/members/:uid  | Project Admin  | Remove member       |

### Tasks
| Method | Path                                    | Access          | Description      |
|--------|-----------------------------------------|-----------------|------------------|
| GET    | /api/projects/:pid/tasks                | Member          | List tasks       |
| POST   | /api/projects/:pid/tasks                | Member          | Create task      |
| PUT    | /api/projects/:pid/tasks/:tid           | Member/Admin    | Update task      |
| DELETE | /api/projects/:pid/tasks/:tid           | Creator/Admin   | Delete task      |

### Dashboard & Users
| Method | Path                  | Access | Description          |
|--------|-----------------------|--------|----------------------|
| GET    | /api/dashboard        | Auth   | Stats overview       |
| GET    | /api/users            | Auth   | All users list       |
| GET    | /api/users/search     | Auth   | Search users         |
| PATCH  | /api/users/:id/role   | Admin  | Change user role     |

---

## Local Development

### Prerequisites
- Node.js 18+

### Setup

```bash
# Clone the repo
git clone <your-repo-url>
cd taskflow

# Install backend dependencies
cd backend && npm install && cd ..

# Install frontend dependencies  
cd frontend && npm install && cd ..

# Create .env in backend/
cp .env.example backend/.env
# Edit JWT_SECRET to something secure
```

### Run

```bash
# Terminal 1 — Backend (port 5000)
cd backend && node server.js

# Terminal 2 — Frontend dev server (port 5173)
cd frontend && npm run dev
```

Visit http://localhost:5173

---

## 🚀 Deploy to Railway

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/taskflow.git
git push -u origin main
```

### Step 2 — Create Railway Project
1. Go to [railway.app](https://railway.app) → New Project
2. Select **"Deploy from GitHub repo"**
3. Choose your `taskflow` repository

### Step 3 — Set Environment Variables
In Railway dashboard → your service → **Variables**:

```
JWT_SECRET=your-very-long-random-secret-here
NODE_ENV=production
PORT=5000
```

### Step 4 — Add a Volume (for persistent database)
1. In Railway → your service → **Volumes**
2. Add volume mounted at `/app`
3. Set `DB_PATH=/app/taskflow.db` in Variables

### Step 5 — Deploy
Railway will auto-detect `nixpacks.toml` and build. Your app will be live at the Railway-provided URL.

---

## Database Schema

```sql
users          (id, name, email, password, role, created_at)
projects       (id, name, description, owner_id, status, created_at)
project_members(project_id, user_id, role, joined_at)  -- PK composite
tasks          (id, title, description, project_id, assignee_id, 
                creator_id, status, priority, due_date, created_at, updated_at)
```

**Relationships:**
- User → owns many Projects
- Project ↔ Users via project_members (many-to-many, with role)
- Project → has many Tasks
- Task → assigned to one User, created by one User

---

## RBAC Rules

| Action               | Global Admin | Project Admin | Assigned Member | Other Member |
|---------------------|:---:|:---:|:---:|:---:|
| View any project     | ✅  | —   | —   | —   |
| Create project       | ✅  | ✅  | ✅  | ✅  |
| Archive project      | ✅  | ✅  | ❌  | ❌  |
| Add/remove members   | ✅  | ✅  | ❌  | ❌  |
| Create task          | ✅  | ✅  | ✅  | ✅  |
| Update any task      | ✅  | ✅  | ❌  | ❌  |
| Update own task      | ✅  | ✅  | ✅  | ❌  |
| Delete task          | ✅  | ✅  | Own | ❌  |
| Manage user roles    | ✅  | ❌  | ❌  | ❌  |
