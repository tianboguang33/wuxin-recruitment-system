# Wuxin Heavy Industry AI Recruitment System

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D%2020.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/typescript-%3E%3D%205.0-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/react-%3E%3D%2018.0-blue.svg)](https://reactjs.org/)

An intelligent AI-powered recruitment system for Wuxin Heavy Industry, featuring a complete workflow with 9 autonomous agents, state machine engine, MCP services, and a modern React frontend.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [Agents](#-agents)
- [State Machine](#-state-machine)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [License](#-license)

## ✨ Features

- **9 Autonomous Agents**: JD Generator, JD Publisher, Resume Collector, Resume Parser, HR Bot, Interview Robot, Evaluator, Notifier, DB Maintainer
- **State Machine Engine**: 15 states and 14 events managing the complete recruitment lifecycle
- **Task Queue**: SQLite-based task queue with exponential backoff for concurrency safety
- **MCP Services**: Modular services for recruitment and AI interview integration
- **React Frontend**: Modern, responsive recruitment portal with admin dashboard
- **Concurrency Protection**: SQLite read-write separation, idempotent email sending, exponential backoff polling
- **Cloudflare Tunnel**: External access support for candidate interview scheduling

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│                  Hooks 层（触发层）                   │
│  定义"什么时候做" - 智能体主动检测状态变化，触发动作     │
└──────────────────┬──────────────────────────────────┘
                   │ 触发事件
                   ▼
┌─────────────────────────────────────────────────────┐
│                状态机层（验证层）                      │
│  定义"能不能做" - 验证状态转换是否合法                  │
└──────────────────┬──────────────────────────────────┘
                   │ 验证通过
                   ▼
┌─────────────────────────────────────────────────────┐
│              TaskQueue层（执行层）                     │
│  定义"怎么安全地做" - 原子操作保证并发安全              │
│  当前实现: SQLite pending_tasks 表                    │
└─────────────────────────────────────────────────────┘
```

### Service Architecture

```
外部候选人
    │
    ▼  Cloudflare Tunnel (外网穿透)
https://xxx.trycloudflare.com
    │
    ▼  server-proxy.cjs (统一代理 :5173)
    ├── /static/*, /form, /submit → Flask (:5000) 表单服务
    │     └── MCP Server: mcp_recruitment
    ├── /api/* → Express (:3001) 招聘系统后端
    │     ├── 状态机引擎
    │     ├── SQLite 数据库 (主连接 + 只读副本)
    │     ├── 任务队列 (pending_tasks + 指数退避)
    │     ├── 幂等发送表 (outbox)
    │     └── MCP Server: mcp_ai-interview
    └── / → React 前端 (dist/)
```

## 🛠️ Tech Stack

### Backend
- **Node.js** 20.x+
- **TypeScript** 5.x+
- **Express** 4.x
- **SQLite** (read-write separation)
- **MCP Services** (recruitment, AI interview, email)

### Frontend
- **React** 18.x+
- **Vite** 6.x+
- **TailwindCSS** 3.x+
- **Lucide React** Icons
- **React Router**

### External Services
- **DeepSeek API** - Interview evaluation
- **Volcengine ASR** - Speech recognition
- **Cloudflare Tunnel** - External access

### Infrastructure
- **Flask** (Interview scheduling form)
- **WebSocket** (Real-time interview)

## 📁 Project Structure

```
wuxin-recruitment-system/
├── .trae/                      # Trae Agent configuration
│   └── documents/              # PRD and architecture docs
├── generator/001/              # Agent scripts and tools
│   ├── hr-form-integration/    # HR form service integration
│   ├── interviewer-agent/      # Interview agent skill
│   └── uploads/                # Resume uploads
├── table/hr-form-service/      # Flask form service
├── web/                        # Main web application
│   ├── api/                    # Express backend
│   │   ├── routes/             # API routes
│   │   ├── services/           # Business services
│   │   ├── state-machine/      # State machine engine
│   │   └── task-queue/         # Task queue implementation
│   ├── mcp-server/             # MCP server implementation
│   ├── src/                    # React frontend
│   │   ├── components/         # UI components
│   │   ├── pages/              # Pages (public + admin)
│   │   └── store/              # State management
│   └── dist/                   # Build output
├── .gitignore
├── LICENSE
├── CONTRIBUTING.md
├── SECURITY.md
└── README.md
```

## 📦 Installation

### Prerequisites

- Node.js 20.x or higher
- Python 3.10+ (for Flask form service)
- Git

### Clone Repository

```bash
git clone https://github.com/tianboguang33/wuxin-recruitment-system.git
cd wuxin-recruitment-system
```

### Backend Setup (Express)

```bash
cd web
npm install
```

### Frontend Setup (React)

```bash
cd web
npm install
```

### Flask Form Service Setup

```bash
cd table/hr-form-service
pip install -r requirements.txt
```

## 🚀 Quick Start

### Development Mode

1. **Start Express Backend**
   ```bash
   cd web
   npm run server:dev
   ```
   Runs on `http://localhost:3001`

2. **Start Flask Form Service**
   ```bash
   cd table/hr-form-service
   python app.py
   ```
   Runs on `http://localhost:5000`

3. **Start Proxy Server**
   ```bash
   cd web
   node server-proxy.cjs
   ```
   Runs on `http://localhost:5173`

4. **Start React Frontend**
   ```bash
   cd web
   npm run dev
   ```
   Runs on `http://localhost:5173`

### Production Mode

```bash
cd web
npm run build
npm run server:prod
```

### Cloudflare Tunnel (for external access)

```bash
cloudflared tunnel --url http://localhost:5173
```

## 🤖 Agents

The system consists of 9 autonomous agents working together:

| Agent | Polling Interval | Core Responsibility |
|-------|------------------|---------------------|
| JD Generator | 6h | Generate job descriptions |
| JD Publisher | 10m/30m/1h | Publish jobs to recruitment portal |
| Resume Collector | 5m/30m/1h | Collect resumes from channels |
| Resume Parser | 5m/15m/30m | Parse and score resumes |
| HR Boot | 10m/30m/1h | Send interview invitations |
| Interview Robot | 1m/5m/10m | Create rooms and conduct AI interviews |
| Evaluator | 5m/10m/15m | Comprehensive evaluation |
| Notifier | 5m/15m/30m | Send notification emails |
| DB Maintainer | 15m | Database maintenance |

## 📊 State Machine

### States (15)

| State | Description |
|-------|-------------|
| `pending` | Application submitted |
| `screening` | Resume screening in progress |
| `screened` | Resume screening passed |
| `screening_rejected` | Resume screening failed |
| `invitation_sent` | Interview invitation sent |
| `room_created` | Interview room created |
| `interview_scheduled` | Interview scheduled |
| `interviewing` | AI interview in progress |
| `evaluation_pending` | Evaluation pending (manual review) |
| `evaluation_passed` | Evaluation passed |
| `evaluation_failed` | Evaluation failed |
| `offer_sent` | Offer sent |
| `accepted` | Offer accepted |
| `declined` | Offer declined |
| `rejected` | Rejected |

### Evaluation Formula

```
Overall Score = Resume Score × 0.3 + Interview Score × 0.7
```

## 📡 API Documentation

### Authentication

All API endpoints require API key authentication via `X-API-Key` header.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/jobs` | List all jobs |
| GET | `/api/jobs/:id` | Get job details |
| POST | `/api/jobs` | Create new job |
| PUT | `/api/jobs/:id` | Update job |
| DELETE | `/api/jobs/:id` | Delete job |
| POST | `/api/applications` | Submit application |
| GET | `/api/applications` | List applications |
| GET | `/api/applications/:id` | Get application details |
| POST | `/api/applications/:id/transition` | Trigger state transition |
| POST | `/api/uploads` | Upload resume |
| GET | `/api/resumes/:id` | Get resume |
| POST | `/api/maintenance/run` | Run maintenance |
| GET | `/api/stats` | Get statistics |

### MCP Services

#### mcp_recruitment

| Tool | Purpose |
|------|---------|
| `system_status` | Check service status |
| `create_candidate` | Create candidate record |
| `list_candidates` | List candidates |
| `get_candidate` | Get candidate details |
| `update_candidate_status` | Update candidate status |
| `restart_tunnel` | Restart Cloudflare tunnel |

#### mcp_ai-interview

| Tool | Purpose |
|------|---------|
| `prepare_interview` | Create interview room |
| `list_interviews` | List interview rooms |
| `interview_result` | Get interview result |

## 👥 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on contributing to this project.

## 🔒 Security

See [SECURITY.md](SECURITY.md) for security policies and reporting vulnerabilities.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Wuxin Heavy Industry](https://www.wuxin.com) for providing the business requirements
- [DeepSeek](https://www.deepseek.com) for AI interview evaluation
- [Volcengine](https://www.volcengine.com) for ASR services
- [Cloudflare](https://www.cloudflare.com) for tunnel services