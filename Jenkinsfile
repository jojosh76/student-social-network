pipeline {
    agent any
    environment {
        DOCKER_IMAGE_TAG = "latest"
    }

    stages {
        stage('Checkout Code') {
            steps {
                checkout scm
            }
        }

        stage('Validate Code') {
            steps {
                sh '''
                    echo "Validating JavaScript files..."
                    node --check backend/gateway/server.js || true
                    node --check backend/services/auth/server.js || true
                    node --check backend/services/content/server.js || true
                '''
            }
        }

        stage('Build Docker Images') {
            steps {
                dir('backend') {
                    sh 'docker-compose build --no-cache'
                }
            }
        }

        stage('Push Images to Docker Hub') {
            steps {
                sh '''
                    docker push jefflionel40/campuslink-gateway:${DOCKER_IMAGE_TAG}
                    docker push jefflionel40/campuslink-auth:${DOCKER_IMAGE_TAG}
                    docker push jefflionel40/campuslink-content:${DOCKER_IMAGE_TAG}
                    # Add others as needed
                '''
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    kubectl apply -f k8s/full-stack-with-hpa.yaml
                    kubectl rollout restart deployment campuslink-gateway
                    kubectl rollout status deployment campuslink-gateway --timeout=60s
                '''
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    echo "Running smoke tests..."
                    sleep 20
                    curl -f http://localhost:3100/health || echo "Health check failed"
                '''
            }
        }
    }

    post {
        success {
            echo '✅ Pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed!'
        }
    }
}