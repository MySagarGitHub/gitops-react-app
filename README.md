# GitOps-Enabled React Application & DevSecOps Pipeline

A production-grade **React 19 + Vite 8** Single Page Application (SPA) integrated with a containerized deployment workflow, security audit gates, and automated **GitOps continuous delivery**.

---

## 📌 Architecture & System Overview

```
+-----------------------------------------------------------------------------------+
|                                  DEVELOPER WORKFLOW                               |
|                                                                                   |
|   +-------------------+    git push     +-----------------------------------+     |
|   |  Local Codebase   | ------------->  |  Source Code Repository (GitHub)  |     |
|   +-------------------+                 +-----------------------------------+     |
+---------------------------------------------------|-------------------------------+
                                                    | Webhook / Trigger
                                                    v
+-----------------------------------------------------------------------------------+
|                             JENKINS DEVSECOPS PIPELINE                            |
|                                                                                   |
|  1. Checkout & Prepare  --->  2. Dependency Audit  --->  3. Secret Scan (Gitleaks) |
|                                                                 |                 |
|  6. Docker Build        <---  5. SAST (Semgrep)    <---  4. Lint & Unit Tests    |
|        |                                                                          |
|        v                                                                          |
|  7. Image Scan (Trivy)  --->  8. Push Image        --->  9. Update GitOps Repo    |
|                               (Docker Hub)                 (Manifests Sync)       |
+-------------------------------------------------------------------|---------------+
                                                                    | Commit Image Tag
                                                                    v
+-----------------------------------------------------------------------------------+
|                             GITOPS KUBERNETES DEPLOYMENT                          |
|                                                                                   |
|  +------------------------------+     Sync     +-------------------------------+  |
|  |   GitOps Manifests Repo      | -----------> |   ArgoCD / Flux CD Controller |  |
|  | (environments/dev/deploy.yaml) |              +-------------------------------+  |
|  +------------------------------+                              | Pull & Apply     |
|                                                                v                  |
|                                                +-------------------------------+  |
|                                                |  Kubernetes Cluster (NGINX)   |  |
|                                                +-------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 📁 Repository Structure

```
app/
├── .github/                  # CI workflows / integrations
├── .oxlintrc.json            # Oxlint JavaScript/React lint configuration
├── Dockerfile                # Multi-stage Docker build specification
├── Jenkinsfile               # Declarative DevSecOps & GitOps pipeline definition
├── README.md                 # System overview and implementation guide
├── index.html                # HTML5 entry point
├── nginx.conf                # Production NGINX web server configuration & health checks
├── package.json              # NPM dependencies, scripts, and Vitest test setup
├── security/
│   └── gitleaks.toml         # Gitleaks secret detection configuration
├── src/
│   ├── App.css               # Application visual styles
│   ├── App.jsx               # Main React root component
│   ├── App.test.jsx          # Vitest unit testing suite
│   ├── index.css             # Global CSS design tokens
│   ├── main.jsx              # React DOM render entrypoint
│   └── assets/               # SVG/PNG static assets
└── vite.config.js            # Vite build tool setup
```

---

## 🛠️ Technology Stack

| Layer | Component | Version / Tools | Description |
| :--- | :--- | :--- | :--- |
| **Frontend UI** | React | `^19.2.8` | Declarative component UI model |
| **Build Tooling** | Vite | `^8.2.0` | Ultra-fast HMR and bundle compilation |
| **Testing** | Vitest | `^4.1.10` | Fast unit testing framework compatible with Vite |
| **Linter** | Oxlint | `^1.75.0` | Rust-powered high-performance JavaScript/React linter |
| **Container Engine**| NGINX & Docker | `nginx:1.27-alpine` | Lightweight web server serving static SPA production build |
| **CI/CD Orchestrator**| Jenkins | Declarative Pipeline | End-to-end automated build, test, scan, and deploy pipeline |
| **Security Audit** | Gitleaks / Semgrep / Trivy | Latest CLI tools | Secrets detection, SAST code security, and container image vulnerability scanning |
| **CD Pattern** | GitOps | Manifest Repositories | Infrastructure state managed declaratively via Git commits |

---

## 🚀 DevSecOps Pipeline Stages ([Jenkinsfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Jenkinsfile))

The CI/CD pipeline enforces automated security gates before deploying updates:

1. **Prepare Variables**: Extracts Git commit hash (`git rev-parse --short HEAD`) and ISO build timestamps.
2. **Install Dependencies**: Runs `npm ci` for clean, deterministic dependency installation.
3. **Secret Detection**: Runs `gitleaks detect` against [gitleaks.toml](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/security/gitleaks.toml) to block hardcoded API keys or secrets.
4. **Dependency Audit**: Executes `npm audit --omit=dev --audit-level=high` to identify supply chain vulnerabilities.
5. **Linting**: Performs static code quality checks using `oxlint`.
6. **SAST Scanning**: Scans code with `semgrep scan` for static application security issues.
7. **Unit Tests**: Executes `npm test` (`vitest run`) validating application functionality.
8. **Container Build**: Builds multi-stage Docker image injecting build metadata arguments (`VITE_APP_VERSION`, `VITE_BUILD_TIME`, etc.).
9. **Image Vulnerability Scan**: Runs `trivy image --severity CRITICAL,HIGH` to ensure zero critical image vulnerabilities.
10. **Container Registry Push**: Logs into Docker Hub using credentials and pushes `${IMAGE_NAME}:${IMAGE_TAG}`.
11. **GitOps Repository Update**: Clones the Kubernetes manifest repository (`Gitops-manifests`), updates `deployment.yaml` with the new image tag, and commits changes back to Git.

---

## ⚙️ Container & NGINX Setup

### Multi-Stage Dockerfile ([Dockerfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Dockerfile))
* **Build Stage**: Node 20 Alpine builder executes production Vite build output to `/app/dist`.
* **Runtime Stage**: NGINX Alpine image copies `/app/dist` into `/usr/share/nginx/html`.
* **Health Check**: Configured `HEALTHCHECK` pinging `http://localhost/health`.

### NGINX Web Server Configuration ([nginx.conf](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/nginx.conf))
* Serves static assets on port `80`.
* Provides dedicated `/health` endpoint returning HTTP 200 `OK`.
* Implements client-side SPA routing fallback:
  ```nginx
  location / {
      try_files $uri $uri/ /index.html;
  }
  ```

---

## 💻 Local Setup & Developer Guide

### Prerequisites
* **Node.js**: `v20.x` or higher
* **npm**: `v10.x` or higher
* **Docker Engine** (for container testing)

### Installation
```bash
# Clone the repository
git clone https://github.com/MySagarGitHub/gitops-react-app.git
cd gitops-react-app

# Install dependencies
npm install
```

### Running Locally
```bash
# Start Vite development server with Hot Module Replacement (HMR)
npm run dev
```

### Running Tests & Quality Checks
```bash
# Run unit tests with Vitest
npm test

# Run Oxlint static analysis
npm run lint

# Build production bundle
npm run build
```

### Building & Running Container Locally
```bash
# Build Docker container image
docker build -t react-gitops-app:local .

# Run container on port 8080
docker run -d -p 8080:80 --name gitops-app react-gitops-app:local

# Test health check endpoint
curl http://localhost:8080/health
```

---

## 🔄 Summary of Recent Code Updates

* **Fixed Pipeline Command Corruptions**: Corrected syntax errors in [Jenkinsfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Jenkinsfile) (`--short`, `docker push`, `git push`, target clone directory).
* **Configured Unit Testing**: Added [vitest](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/package.json) dependency, `"test"` script, and unit test suite in [App.test.jsx](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/src/App.test.jsx).
* **Added Security Scanning Rules**: Created [security/gitleaks.toml](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/security/gitleaks.toml) rule file for secret detection.
* **Documented Architecture**: Added full system documentation and pipeline workflow overview in `README.md`.
