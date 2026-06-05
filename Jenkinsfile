pipeline {
    agent any
    
    environment {
        DOCKER_TAG = "build-${BUILD_NUMBER}"
        KUBECONFIG = '/etc/rancher/k3s/k3s.yaml'
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }
        
        stage('Build All Images') {
            steps {
                script {
                    // Build frontend
                    sh "docker build -t jefflionel40/campuslink-frontend:${DOCKER_TAG} -f frontend/Dockerfile frontend/"
                    sh "docker tag jefflionel40/campuslink-frontend:${DOCKER_TAG} jefflionel40/campuslink-frontend:latest"
                    
                    // Build gateway
                    sh "docker build -t jefflionel40/campuslink-gateway:${DOCKER_TAG} -f backend/gateway/Dockerfile backend/"
                    sh "docker tag jefflionel40/campuslink-gateway:${DOCKER_TAG} jefflionel40/campuslink-gateway:latest"
                    
                    // Build backend services
                    def services = [
                        [name: 'auth', dockerfile: 'backend/services/auth/Dockerfile', context: 'backend/services/auth'],
                        [name: 'users', dockerfile: 'backend/services/users/Dockerfile', context: 'backend/services/users'],
                        [name: 'content', dockerfile: 'backend/services/content/Dockerfile', context: 'backend/services/content'],
                        [name: 'messaging', dockerfile: 'backend/services/messaging/Dockerfile', context: 'backend/services/messaging'],
                        [name: 'files', dockerfile: 'backend/services/files/Dockerfile', context: 'backend/services/files']
                    ]
                    
                    services.each { svc ->
                        echo "Building ${svc.name}..."
                        sh "docker build -t jefflionel40/campuslink-${svc.name}:${DOCKER_TAG} -f ${svc.dockerfile} ${svc.context}"
                        sh "docker tag jefflionel40/campuslink-${svc.name}:${DOCKER_TAG} jefflionel40/campuslink-${svc.name}:latest"
                    }
                }
            }
        }
        
        stage('Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                    sh 'echo $DOCKER_PASS | docker login -u $DOCKER_USER --password-stdin'
                    
                    script {
                        def images = ['frontend', 'gateway', 'auth', 'users', 'content', 'messaging', 'files']
                        images.each { img ->
                            sh "docker push jefflionel40/campuslink-${img}:${DOCKER_TAG}"
                            sh "docker push jefflionel40/campuslink-${img}:latest"
                        }
                    }
                }
            }
        }
        
        stage('Deploy to K3s') {
            steps {
                sh '''
                    kubectl apply -f k8s/
                    
                    kubectl set image deployment/campuslink-frontend frontend=jefflionel40/campuslink-frontend:${DOCKER_TAG}
                    kubectl set image deployment/campuslink-gateway gateway=jefflionel40/campuslink-gateway:${DOCKER_TAG}
                    kubectl set image deployment/campuslink-auth auth=jefflionel40/campuslink-auth:${DOCKER_TAG}
                    kubectl set image deployment/campuslink-users users=jefflionel40/campuslink-users:${DOCKER_TAG}
                    kubectl set image deployment/campuslink-content content=jefflionel40/campuslink-content:${DOCKER_TAG}
                    kubectl set image deployment/campuslink-messaging messaging=jefflionel40/campuslink-messaging:${DOCKER_TAG}
                    kubectl set image deployment/campuslink-files files=jefflionel40/campuslink-files:${DOCKER_TAG}
                    
                    kubectl rollout status deployment/campuslink-frontend --timeout=120s
                    kubectl rollout status deployment/campuslink-gateway --timeout=120s
                    kubectl rollout status deployment/campuslink-auth --timeout=120s
                '''
            }
        }
        
        stage('Smoke Test') {
            steps {
                sh '''
                    sleep 15
                    kubectl get pods
                    kubectl run smoke-test --rm -i --restart=Never --image=curlimages/curl -- curl -f http://campuslink-gateway:3000/health
                '''
            }
        }
    }
    
    post {
        success {
            echo '✅ Full CI/CD pipeline completed successfully!'
        }
        failure {
            echo '❌ Pipeline failed! Check logs above.'
        }
        always {
            sh 'docker logout || true'
            sh 'docker system prune -f || true'
        }
    }
}