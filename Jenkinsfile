pipeline {

    agent any

    environment {
        APP_NAME    = "react-cicd"
        REGISTRY    = "sagar019"
        IMAGE_NAME  = "${REGISTRY}/${APP_NAME}"
        DEPLOY_ENV  = "dev"
        GITOPS_REPO = "https://github.com/MySagarGitHub/Gitops-manifests.git"
        GITOPS_BRANCH = "main"
    }

    stages {

        stage("Checkout Code") {
            steps {
                checkout scm
            }
        }

        stage("Clear Docker Credentials") {
            steps {
                bat "docker logout"
            }
        }

        stage("Prepare Variables") {
            steps {
                script {
                    bat "icacls \"%WORKSPACE%\" /grant Everyone:(OI)(CI)F /T"

                    def gitCommit = bat(
                        script: "@git rev-parse --short HEAD",
                        returnStdout: true
                    ).trim()

                    def commitHash = gitCommit.tokenize("\r\n")[-1].trim()

                    env.IMAGE_TAG = commitHash
                    env.FULL_IMAGE = "${env.IMAGE_NAME}:${env.IMAGE_TAG}"

                    def dateStr = bat(
                        script: "@echo %DATE% %TIME%",
                        returnStdout: true
                    ).trim()

                    env.BUILD_TIME = dateStr.tokenize("\r\n")[-1].trim()

                    echo "Image tag: ${env.IMAGE_TAG}"
                    echo "Full image: ${env.FULL_IMAGE}"
                    echo "Build time: ${env.BUILD_TIME}"
                }
            }
        }

        stage("Install Dependencies") {
            steps {
                bat "npm ci"
            }
        }

        stage("Secret Scanning") {
            steps {
                bat "docker run --rm -v \"%WORKSPACE%:/path\" zricethezav/gitleaks:latest detect --source=/path --no-git --exit-code=1"
            }
        }

        stage("Dependency Audit") {
            steps {
                echo "Running npm dependency audit"
                bat "npm audit --omit=dev --audit-level=high"
            }
        }

        stage("Lint") {
            steps {
                bat "npm run lint --if-present"
            }
        }

        stage("SAST - Semgrep") {
            steps {
                bat "docker run --rm -v \"%WORKSPACE%:/src\" semgrep/semgrep semgrep scan --config=p/nodejs --config=p/jwt --config=p/secrets --error /src"
            }
        }

        stage("Unit Tests") {
            steps {
                echo "Running unit tests"
                bat "npm test"
            }
        }

        stage("Build Docker Image") {
            steps {
                bat "docker build -t ${env.FULL_IMAGE} ."
            }
        }

        stage("Scan Docker Image") {
            steps {
                script {
                    echo "Scanning image: ${env.FULL_IMAGE}"

                    bat """
                        docker save -o image.tar ${env.FULL_IMAGE}
                        docker run --rm -v "%cd%:/work" aquasec/trivy:latest image --input /work/image.tar --exit-code 0 --severity HIGH,CRITICAL --no-progress
                        if exist image.tar del /f /q image.tar
                    """
                }
            }
        }

        stage("Docker Login") {
            steps {
                 script {
            
            bat "echo aUVW68KZZFC5bRD | docker login -u sagar019 --password-stdin"
        }
            }
        }

        stage("Push to Registry") {
            when {
                allOf {
                    expression {
                        return env.REGISTRY?.trim()
                    }
                    expression {
                        return env.BRANCH_NAME ==~ /.*main|.*master/ ||
                               env.GIT_BRANCH ==~ /.*main|.*master/
                    }
                }
            }
            steps {
                bat "docker push ${env.FULL_IMAGE}"
            }
        }

        stage("Update GitOps Repo") {
            steps {
                echo "Updating GitOps repository"

                withCredentials([
                    usernamePassword(
                        credentialsId: "gitops-credentials",
                        usernameVariable: "GIT_USER",
                        passwordVariable: "GIT_TOKEN"
                    )
                ]) {
                    bat """
                        @echo off
                        if exist gitops-manifests rmdir /s /q gitops-manifests

                        git clone https://%GIT_USER%:%GIT_TOKEN%@github.com/MySagarGitHub/Gitops-manifests.git gitops-manifests

                        cd gitops-manifests\\environments\\dev

                        powershell -Command "(Get-Content deployment.yaml) -replace 'image: .*', 'image: ${env.FULL_IMAGE}' | Set-Content deployment.yaml"

                        git config user.name "Jenkins"
                        git config user.email "pandaysagar2004@gmail.com"

                        git diff --quiet

                        if errorlevel 1 (
                            git add deployment.yaml
                            git commit -m "Update react-cicd image to ${env.IMAGE_TAG} [skip ci]"
                            git push origin main
                        ) else (
                            echo No GitOps changes needed.
                        )
                    """.stripIndent()
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning workspace"

            script {
                if (env.FULL_IMAGE) {
                    bat "docker rmi ${env.FULL_IMAGE} || exit 0"
                }
            }

            cleanWs()
        }
    }
}