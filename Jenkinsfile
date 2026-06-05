pipeline {
    agent any

    environment {
        COMPOSE_FILE_PATH = 'backend/docker-compose.yml'
    }

    stages {
        stage('Validate JavaScript') {
            steps {
                powershell '''
                    node --check backend/gateway/server.js
                    node --check backend/services/auth/server.js
                    node --check backend/services/users/server.js
                    node --check backend/services/content/server.js
                    node --check backend/services/messaging/server.js
                    node --check backend/services/files/server.js
                    node --check frontend/assets/js/adapters/dashboard.adapter.js
                    node --check frontend/assets/js/adapters/events.adapter.js
                    node --check frontend/assets/js/adapters/profile.adapter.js
                    node --check frontend/assets/js/adapters/notifications.adapter.js
                    node --check frontend/assets/js/adapters/search.adapter.js
                    node --check frontend/assets/js/adapters/chat-list.adapter.js
                    node --check frontend/assets/js/adapters/chat.adapter.js
                    node --check frontend/assets/js/services/domain-services.js
                    node --check frontend/assets/js/services/chat.service.js
                    node --check frontend/assets/js/dtos/dtos.js
                '''
            }
        }

        stage('Validate Compose') {
            steps {
                dir('backend') {
                    powershell 'docker compose config'
                }
            }
        }

        stage('Build Images') {
            steps {
                dir('backend') {
                    powershell 'docker compose build'
                }
            }
        }

        stage('Smoke Test') {
            steps {
                dir('backend') {
                    powershell '''
                        docker compose up -d
                        Start-Sleep -Seconds 20
                        ./scripts/smoke-test.ps1
                    '''
                }
            }
            post {
                always {
                    dir('backend') {
                        powershell 'docker compose down'
                    }
                }
            }
        }
    }
}
