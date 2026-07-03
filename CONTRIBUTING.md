# Contributing to Wuxin Recruitment System

Thank you for your interest in contributing to the Wuxin Heavy Industry AI Recruitment System! We welcome contributions from everyone.

## 📋 Guidelines

### Code of Conduct

Please review our [Code of Conduct](CODE_OF_CONDUCT.md) before contributing.

### How to Contribute

1. **Fork the Repository**
   - Click the "Fork" button at the top of the repository page

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/your-username/wuxin-recruitment-system.git
   cd wuxin-recruitment-system
   ```

3. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Changes**
   - Follow the project's coding conventions
   - Write tests for new features
   - Update documentation

5. **Commit Changes**
   - Use conventional commit messages
   - Example: `feat(api): add new endpoint for job statistics`

6. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch and provide a description

## 📝 Commit Message Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages:

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style (formatting, missing semi-colons, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding tests |
| `chore` | Build process or auxiliary tools |
| `perf` | Performance improvements |

### Example

```
feat(agent): add email notification service

- Implement MCP-based email sending
- Add idempotent email tracking via outbox table
- Support multiple email templates
```

## 🧪 Testing

### Run Tests

```bash
cd web
npm test
```

### Writing Tests

- Write unit tests for new functions
- Write integration tests for API endpoints
- Follow the existing test patterns in the codebase

## 📐 Coding Standards

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint rules (run `npm run lint`)
- Use `const` and `let` appropriately
- Avoid `var`
- Use arrow functions for callbacks
- Use async/await for asynchronous operations

### React

- Use functional components with hooks
- Follow React best practices
- Use TailwindCSS for styling
- Keep components small and focused
- Use TypeScript interfaces for props

### Python

- Use Python 3.10+
- Follow PEP 8 style guide
- Use type hints where applicable
- Use f-strings for string formatting

## 🔧 Development Setup

### Prerequisites

- Node.js 20.x+
- Python 3.10+
- Git

### Environment Variables

Create a `.env` file in the `web` directory:

```env
API_KEY=your-api-key
DB_PATH=data/wuxin.db
PORT=3001
```

### Running Locally

```bash
# Backend
cd web
npm run server:dev

# Frontend
cd web
npm run dev

# Flask service
cd table/hr-form-service
python app.py
```

## 🐛 Reporting Issues

1. Check if the issue already exists in the issue tracker
2. Use the issue template
3. Provide clear steps to reproduce
4. Include error messages and screenshots

## 💡 Feature Requests

1. Use the feature request template
2. Describe the feature clearly
3. Explain why it would be useful
4. Provide implementation suggestions if possible

## 🔄 Pull Request Process

1. Ensure all tests pass
2. Update documentation as needed
3. Include a clear description of changes
4. Reference related issues
5. Wait for review and feedback

## 📜 License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).

## ❓ Questions

If you have any questions, feel free to open an issue or contact the maintainers.