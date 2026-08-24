# GitOps-Enabled React Application & DevSecOps Architecture Description

This document provides a comprehensive technical description of the **GitOps React Application**, including architectural design, DevSecOps continuous integration pipeline, containerization strategy, working mechanisms of all pipeline stages, exact shell commands executed, and quality assurance frameworks.

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
|  1. Checkout Code        --->  2. Prepare Variables    --->  3. Install Dependencies|
|                                                                        |          |
|  6. SAST (Semgrep)       <---  5. Lint (Oxlint)       <---  4. Secret & Audit Scans|
|        |                                                                          |
|        v                                                                          |
|  7. Unit Tests           --->  8. Docker Build         --->  9. Scan Docker (Trivy) |
|                                                                        |          |
|  11. Update GitOps Repo  <---  10. Push Image (Registry)<--------------+          |
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
| [description.md](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/description.md) | Documentation | Complete system architecture, DevSecOps pipeline stage definitions, and reference documentation |
| [Jenkinsfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Jenkinsfile) | CI/CD Engine | 11-stage declarative pipeline (Windows `bat` compatible) for security, testing, container packaging, and GitOps synchronization |
| [Dockerfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Dockerfile) | Packaging | Multi-stage Node.js builder + NGINX runtime container configuration |
| [nginx.conf](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/nginx.conf) | Web Server | NGINX routing, SPA fallback (`try_files`), and `/health` probe endpoint |
| [package.json](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/package.json) | Package Manifest | App metadata, Vite build scripts, Oxlint linter, and Vitest test runner |
| [security/gitleaks.toml](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/security/gitleaks.toml) | Security | Gitleaks secret detection rule definitions & path allowlists |
| [src/App.jsx](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/src/App.jsx) | React UI | Core application root component |
| [src/App.test.jsx](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/src/App.test.jsx) | Testing | Vitest unit test suite validating application setup |
| [vite.config.js](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/vite.config.js) | Build Tool | Vite configuration and React plugin integration |

---

## ⚡ Pipeline Stages: Working Mechanism & Executed Commands

The Jenkins pipeline is defined declaratively in [Jenkinsfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Jenkinsfile) and optimized for cross-platform execution (including Windows agents). Below is the breakdown of each pipeline stage:

### 1. Checkout Code
* **Mechanism**: Uses Jenkins SCM engine to pull the latest source code revision from the Git repository.
* **Command**:
  ```groovy
  checkout scm
  ```

### 2. Prepare Variables
* **Mechanism**: Extracts the short Git commit SHA to use as a dynamic immutable tag (`IMAGE_TAG`), constructs the full image tag (`FULL_IMAGE`), and captures the build timestamp.
* **Commands**:
  ```cmd
  @git rev-parse --short HEAD
  @echo %DATE% %TIME%
  ```

### 3. Install Dependencies
* **Mechanism**: Navigates into the `app` directory and installs locked Node modules defined in `package-lock.json` in a clean, reproducible manner.
* **Command**:
  ```cmd
  cd app && npm ci
  ```

### 4. Secret Scanning
* **Mechanism**: Mounts the codebase into a containerized Gitleaks engine to detect exposed tokens, API keys, and sensitive data prior to building binaries.
* **Command**:
  ```cmd
  docker run --rm -v "%WORKSPACE%\app:/path" zricethezav/gitleaks:latest detect --source=/path --no-git --exit-code=1
  ```

### 5. Dependency Audit
* **Mechanism**: Scans non-development production dependencies for published CVE vulnerabilities with a high severity threshold.
* **Command**:
  ```cmd
  cd app && npm audit --omit=dev --audit-level=high
  ```

### 6. Lint
* **Mechanism**: Executes fast, Rust-powered `oxlint` static code analysis across JavaScript and JSX source files to detect code smells and syntax issues.
* **Command**:
  ```cmd
  cd app && npm run lint --if-present
  ```

### 7. SAST (Semgrep)
* **Mechanism**: Runs Static Application Security Testing (SAST) using Semgrep rulesets tailored for Node.js, JWT, and secrets logic inside the code repository.
* **Command**:
  ```cmd
  docker run --rm -v "%WORKSPACE%\app:/src" semgrep/semgrep semgrep scan --config=p/nodejs --config=p/jwt --config=p/secrets --error /src
  ```

### 8. Unit Tests
* **Mechanism**: Executes unit test suites non-interactively using Vitest to verify core component rendering and logical correctness.
* **Command**:
  ```cmd
  cd app && npm test
  ```

### 9. Build Docker Image
* **Mechanism**: Builds the multi-stage Docker image using [Dockerfile](file:///c:/Users/panda/OneDrive/Desktop/GitOps/app/Dockerfile), creating a lightweight NGINX-served distribution tagged with the dynamic commit hash.
* **Command**:
  ```cmd
  cd app && docker build -t %FULL_IMAGE% .
  ```

### 10. Scan Docker Image
* **Mechanism**: Exports the built container image to a tarball archive and runs Aqua Security Trivy image scanning to fail/flag HIGH or CRITICAL OS-level vulnerabilities.
* **Commands**:
  ```cmd
  docker save -o image.tar %FULL_IMAGE%
  docker run --rm -v %cd%:/work aquasec/trivy:latest image --input /work/image.tar --exit-code 0 --severity HIGH,CRITICAL --no-progress
  if exist image.tar del /f /q image.tar
  ```

### 11. Push to Registry
* **Mechanism**: Authenticates securely against Docker Hub using Jenkins secret credentials (`docker-registry-creds`) on branch matching (`main`/`master`) and pushes the image.
* **Commands**:
  ```cmd
  echo %DOCKER_PASS% | docker login -u %DOCKER_USER% --password-stdin
  docker push %FULL_IMAGE%
  ```

### 12. Update GitOps Repo
* **Mechanism**: Clones the external GitOps manifest repository (`Gitops-manifests`), uses PowerShell to safely update `image:` fields inside `deployment.yaml`, checks for git status changes, and commits/pushes the update to trigger automated ArgoCD/Flux deployment.
* **Commands**:
  ```cmd
  git clone https://%GIT_USER%:%GIT_TOKEN%@github.com/MySagarGithub/Gitops-manifests.git gitops-react-manifests
  cd gitops-react-manifests\environments\dev
  powershell -Command "(Get-Content deployment.yaml) -replace 'image: .*', 'image: %FULL_IMAGE%' | Set-Content deployment.yaml"
  git config user.name "Jenkins"
  git config user.email "pandaysagar2004@gmail.com"
  git diff --quiet || (git add deployment.yaml && git commit -m "Update react-cicd-demo image to %IMAGE_TAG% [skip ci]" && git push origin main)
  ```

### 13. Post Actions Cleanup
* **Mechanism**: Ensures that local dangling Docker images built during the pipeline execution are cleaned up and the workspace folder is purged.
* **Commands**:
  ```cmd
  if defined FULL_IMAGE docker rmi %FULL_IMAGE% || exit 0
  ```

---

## 🛡️ Summary of DevSecOps Quality & Security Gates

1. **Gitleaks**: Prevents committed secrets/credentials.
2. **NPM Audit**: Prevents vulnerable production node dependencies.
3. **Oxlint**: Rapid Rust-based code format & rule verification.
4. **Semgrep SAST**: Deep code security pattern scanning.
5. **Vitest**: Application logic and component unit testing.
6. **Trivy Image Scan**: Container filesystem & base image vulnerability auditing.

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
