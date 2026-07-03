# Security Policy

## Supported Versions

Currently, only the latest version of this project is supported with security updates.

| Version | Supported |
|---------|-----------|
| Latest | ✅ |

## Reporting a Vulnerability

We take security seriously. If you discover a security vulnerability, please follow the steps below:

### Steps to Report

1. **Do not disclose publicly** - Please do not create a public issue or discuss the vulnerability on any public forum.

2. **Contact us privately** - Send an email to [security@wuxin.com](mailto:security@wuxin.com) with the following information:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if you have one)

3. **Wait for response** - We will acknowledge your email within 48 hours and provide a timeline for the fix.

### Response Timeline

| Phase | Timeframe |
|-------|-----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix development | Within 30 days |
| Public disclosure | After fix deployment |

## Security Best Practices

### Authentication

- Use API keys for all API endpoints
- Store sensitive credentials in environment variables
- Never commit secrets to version control
- Rotate API keys regularly

### Data Protection

- Encrypt sensitive data at rest
- Use HTTPS for all communications
- Sanitize user input to prevent injection attacks
- Implement proper access controls

### Input Validation

- Validate all incoming data
- Use parameterized queries for database operations
- Implement rate limiting to prevent abuse
- Handle file uploads carefully

### Secure Coding Guidelines

- Follow OWASP Top 10 security practices
- Use prepared statements for SQL queries
- Implement CSRF protection
- Use secure cookies with HttpOnly and Secure flags

### Infrastructure Security

- Use firewalls to restrict access
- Regularly update dependencies
- Monitor logs for suspicious activity
- Implement intrusion detection

## Security Features in This Project

### Built-in Security

1. **SQLite Read-Write Separation**
   - Main connection for write operations
   - Read-only replica for SELECT queries

2. **Idempotent Operations**
   - Outbox table for email sending
   - Prevent duplicate processing

3. **Input Sanitization**
   - Validation middleware for all inputs
   - TypeScript type checking

4. **API Key Authentication**
   - Required for all API endpoints
   - Configurable via environment variables

5. **Rate Limiting**
   - Built-in rate limiting for API endpoints
   - Configurable thresholds

### Security Headers

The application sets the following security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`

## Dependencies

### Regular Updates

- Dependencies are updated regularly
- Security advisories are monitored
- Vulnerabilities are addressed promptly

### Dependency Checks

```bash
# Check for vulnerabilities
npm audit

# Update dependencies
npm update
```

## Incident Response

### Security Incident Procedure

1. **Detection** - Identify the security incident
2. **Containment** - Isolate affected systems
3. **Eradication** - Remove the threat
4. **Recovery** - Restore systems to normal operation
5. **Lessons Learned** - Document the incident and update procedures

### Contact

For security incidents, contact: [security@wuxin.com](mailto:security@wuxin.com)

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.