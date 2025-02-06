# PrivBench

PrivBench is a comprehensive platform designed for benchmarking text privatization methods. It provides a secure and confidential environment to evaluate various text privatization techniques using a set of comprehensive metrics. The platform is built with a microservices architecture, leveraging Docker for containerization, and includes a frontend, backend, database, and task queue system.

## Getting Started

### Prerequisites

- Docker
- Docker Compose

### Running the Application

To start the application using Docker, follow these steps:

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd <repository-directory>
   ```

2. Build and start the services using Docker Compose:
   ```bash
   docker-compose up --build
   ```

3. Access the application:
   - Frontend: Open [http://localhost:3000](http://localhost:3000) in your browser.
   - Backend API: Accessible at [http://localhost:5000](http://localhost:5000).

## Using the Application

### User and Admin User Manual

   - **[User Manual](PrivBench_User_Manual_vF.pdf)**
   - **[Admin Manual](PrivBench_Admin_Manual_vF.pdf)**


## Components

### Frontend

- **Technology**: React
- **Description**: The frontend is a React application that provides a user interface for interacting with the PrivBench platform. It allows users to submit datasets, view rankings, and access detailed reports on text privatization methods.
- **Development**: The frontend is built using Create React App and can be started in development mode with `npm start`.

### Backend

- **Technology**: Flask
- **Description**: The backend is a Flask application that serves as the API for the PrivBench platform. It handles user authentication, dataset management, and communication with the database and task queue.
- **Development**: The backend is structured to support modular development, with routes and services organized by functionality.

### Database

- **Technology**: PostgreSQL
- **Description**: The database stores user data, datasets, and benchmark results. It is managed using Flask-Migrate for database migrations.
- **Port**: The database is exposed on port 5433 for external connections.

### Task Queue

- **Technology**: Celery with Redis
- **Description**: Celery is used for handling asynchronous tasks, such as running benchmarks and processing datasets. Redis serves as the message broker and result backend for Celery tasks.
- **Development**: Celery workers can be started using the provided entrypoint scripts.

## Additional Information

- **Docker Compose**: The `docker-compose.yml` file defines the services and their configurations, including environment variables, volumes, and dependencies.
- **Environment Variables**: Configuration settings are managed through environment variables, which can be set in a `.env` file or directly in the Docker Compose file.

For more detailed information on each component, refer to the respective directories and files in the project repository.
