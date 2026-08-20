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

                    env.BUILD_TIME = powershell(
                        script: 'Get-Date -AsUTC -Format "yyyy-MM-ddTHH:mm:ssZ"',
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

         stage('Build Docker Image') {
            steps {
                script {
                    def tag = env.REGISTRY
                        ? "${env.REGISTRY}/${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                        : "${env.IMAGE_NAME}:${env.IMAGE_TAG}"
                    dir('project') { bat "docker build -t ${tag} ." }
                    env.FULL_IMAGE = tag
                }
            }
        }


        stage("Scan Docker Image") {
            steps {
        script {
            def imageName = env.FULL_IMAGE ?: "${env.DOCKER_REGISTRY}/${env.IMAGE_NAME}:${env.BUILD_NUMBER}"
            echo "Scanning image: ${imageName}"
            
            
            bat """
                docker save -o image.tar ${imageName}
                docker run --rm -v %cd%:/work aquasec/trivy:latest image --input /work/image.tar --exit-code 0 --severity HIGH,CRITICAL --no-progress
                del image.tar
            """
        }
    }

        }

         stage('Push to Registry') {
            when {
                allOf {
                    expression { return env.REGISTRY?.trim() }
                    
                    expression { return env.GIT_BRANCH ==~ /.*main|.*master/ }
                }
            }
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-registry-creds',
                    usernameVariable: 'DOCKER_USER',
                    passwordVariable: 'DOCKER_PASS'
                )]) {
                    
                    bat "echo %DOCKER_PASS%| docker login -u %DOCKER_USER% --password-stdin"
                    bat "docker push ${env.FULL_IMAGE}"
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