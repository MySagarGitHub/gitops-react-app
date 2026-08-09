# GitOps-Enabled React Application & DevSecOps Architecture Description

This document provides a comprehensive technical description of the **GitOps React Application**, including architectural design, DevSecOps continuous integration pipeline, containerization strategy, and quality assurance framework.

---

## 🏗️ Architectural Overview

The application follows a **GitOps Delivery Model** where infrastructure and deployment states are maintained declaratively in Git repositories.

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

## 📁 Repository File Map & Component Responsibilities

| File Path | Component | Description |
| :--- | :--- | :--- |
| [description.md](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/description.md) | Documentation | Detailed system architecture and implementation reference |
| [Jenkinsfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Jenkinsfile) | CI/CD Engine | 11-stage declarative pipeline for security, testing, image push, and GitOps sync |
| [Dockerfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Dockerfile) | Packaging | Multi-stage Node.js builder + NGINX runtime container configuration |
| [nginx.conf](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/nginx.conf) | Web Server | NGINX routing, SPA fallback (`try_files`), and `/health` probe endpoint |
| [package.json](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/package.json) | Package Manifest | App metadata, Vite build scripts, Oxlint linter, and Vitest test runner |
| [security/gitleaks.toml](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/security/gitleaks.toml) | Security | Gitleaks secret detection rule definitions & path allowlists |
| [src/App.jsx](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/src/App.jsx) | React UI | Core application root component |
| [src/App.test.jsx](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/src/App.test.jsx) | Testing | Vitest unit test suite validating application setup |
| [vite.config.js](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/vite.config.js) | Build Tool | Vite configuration and React plugin integration |

---

## 🛡️ Security & Quality Gates

The DevSecOps pipeline implements shift-left security testing across multiple stages:

1. **Secret Detection (`Gitleaks`)**: Scans repository source files for hardcoded passwords, tokens, or private keys against `security/gitleaks.toml`.
2. **Dependency Audit (`npm audit`)**: Checks direct and indirect npm packages for known vulnerabilities.
3. **Static Code Analysis (`oxlint`)**: Enforces code style, React hook rules, and syntactic correctness using Rust-based linting.
4. **Static Application Security Testing (`Semgrep`)**: Scans code patterns for security vulnerabilities (SAST).
5. **Unit Test Suite (`Vitest`)**: Runs unit tests (`App.test.jsx`) to prevent regression issues.
6. **Container Image Scan (`Trivy`)**: Audits compiled Docker images for OS and library CVEs before registry push.

---

## 🔄 GitOps Deployment Workflow

1. When code is pushed to `main`, Jenkins runs security scans, unit tests, and builds a versioned Docker image (`IMAGE_TAG` = git short commit SHA).
2. Upon successful image push to Docker Hub, Jenkins clones the separate Kubernetes manifests repository (`Gitops-manifests`).
3. Jenkins updates `environments/dev/deployment.yaml` with the new image tag and commits the change.
4. A GitOps controller (such as **ArgoCD** or **Flux**) detects the change in the manifest repository and automatically syncs the updated deployment to the Kubernetes cluster.

---

## 🛠️ Local Execution Commands

### Development Server
```bash
npm run dev
```

### Running Tests & Quality Verification
```bash
npm test
npm run lint
npm run build
```

### Container Build & Testing
```bash
docker build -t gitops-react-app:latest .
docker run -p 8080:80 gitops-react-app:latest
curl http://localhost:8080/health
```
