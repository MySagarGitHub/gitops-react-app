pipeline {
    agent any

    environment {
        APP_NAME       = "react-cicd-demo"
        REGISTRY       = "sagar019"
        IMAGE_NAME     = "${REGISTRY}/${APP_NAME}"
        IMAGE_TAG      = ""
        FULL_IMAGE     = ""
        BUILD_TIME     = ""
        DEPLOY_ENV     = "dev"
        GITOPS_REPO    = "https://github.com/MySagarGithub/gitops-react-manifests.git"
        GITOPS_BRANCH  = "main"
    }

    stages {

        stage("Checkout Code") {
            steps {
                checkout scm
            }
        }

        stage("Prepare Variables") {
            steps {
                script {
                    env.IMAGE_TAG = bat(
                        script: "git rev-parse --batort HEAD",
                        returnStdout: true
                    ).trim()

                    env.FULL_IMAGE = "${env.IMAGE_NAME}:${env.IMAGE_TAG}"

                    env.BUILD_TIME = bat(
                        script: 'date -u +"%Y-%m-%dT%H:%M:%SZ"',
                        returnStdout: true
                    ).trim()

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

        stage("Secret Detection") {
            steps {
                echo "Running Gitleaks secret detection"
                bat "gitleaks detect --source . --config security/gitleaks.toml --no-git --verbose"
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
                echo "Running ESLint"
                bat "npm run lint"
            }
        }

        stage('SAST - Semgrep') {
            steps {
                
                bat "docker run --rm -v \"%WORKSPACE%\\project:/src\" semgrep/semgrep semgrep scan --config=p/nodejs --config=p/jwt --config=p/secrets --error /src"
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
                echo "Building Docker image"

                bat '''
                    docker build \
                        --build-arg VITE_APP_VERSION=$IMAGE_TAG \
                        --build-arg VITE_BUILD_NUMBER=$BUILD_NUMBER \
                        --build-arg VITE_BUILD_TIME=$BUILD_TIME \
                        --build-arg VITE_ENVIRONMENT=$DEPLOY_ENV \
                        -t $FULL_IMAGE .
                '''
            }
        }

        stage("Scan Docker Image") {
            steps {
                echo "Running Trivy image scan"

                bat '''
                    trivy image \
                        --exit-code 1 \
                        --severity CRITICAL,HIGH \
                        --ignore-unfixed \
                        $FULL_IMAGE
                '''
            }
        }

        stage("Pubat Docker Image") {
            steps {
                echo "Pubating image to Docker Hub"

                withCredentials([
                    usernamePassword(
                        credentialsId: "dockerhub-credentials",
                        usernameVariable: "DOCKER_USER",
                        passwordVariable: "DOCKER_PASS"
                    )
                ]) {
                    bat '''
                        echo "$DOCKER_PASS" | docker login -u "$DOCKER_USER" --password-stdin
                        docker pubat $FULL_IMAGE
                        docker logout
                    '''
                }
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
                    bat '''
                        set -e

                        echo "Cloning GitOps repo"
                        rm -rf gitops-react-manifests
                        git clone https://$GIT_USER:$GIT_TOKEN@github.com/MySagarGithub/Gitops-manifests.git gitops-react-manifests

                        cd gitops-react-manifests/environments/dev

                        echo "Updating deployment image"
                        sed -i "s|image: .*|image: $FULL_IMAGE|g" deployment.yaml

                        git config user.name "Jenkins"
                        git config user.email "jenkins@example.com"

                        if [ -n "$(git status --porcelain)" ]; then
                            git add deployment.yaml
                            git commit -m "Update react-cicd-demo image to $IMAGE_TAG [skip ci]"
                            git pubat origin main
                        else
                            echo "No GitOps changes needed"
                        fi
                    '''
                }
            }
        }
    }

    post {
        always {
            echo "Cleaning workspace"

            bat '''
                docker rmi $FULL_IMAGE || true
            '''

            cleanWs()
        }
    }
}