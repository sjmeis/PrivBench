<div align="center">
  <img src="https://github.com/sjmeis/PrivBench/blob/main/frontend/public/images/privbench_title.png?raw=true" alt="PrivBench" width="200"/>

  # PrivBench

  [![License](https://img.shields.io/github/license/sjmeis/PrivBench.svg)](https://github.com/sjmeis/PrivBench/blob/main/LICENSE)

</div>

PrivBench is a holistic and modular benchmarking platform for evaluating text-to-text privatization.

When applying privacy preservation algorithms to textual datasets, researchers often face a trade-off between privacy protections and downstream utility. PrivBench bridges this gap by orchestrating isolated, concurrent evaluations across diverse *modules* (such as semantic similarity, token leakage, and defense against inferences) using a scalable microservices architecture.

---

## Architectural Overview & Design
PrivBench is built as a scalale and extensible web applications to allow for concurrent evaluations, as well as future improvements.

### Core Components
 - **Frontend (React + MUI Joy)**: A non-blocking single-page application ($SPA$) built on top of a unified theme state. It handles file staging, progress bar streaming using async context states, and administrative account toggle gates.
 - **Backend (Flask)**: Operates as a stateless request-response controller. It performs access authentication, whitelists inbound payloads, tracks task statuses, and communicates database schemas. It explicitly delegates execution pipelines to the worker pool to protect HTTP network availability.
 - **Database (PostgreSQL)**: Stores persistent configurations, metadata records, user models, encrypted credentials, evaluation history, and aggregated scorrs.
 - **Asynchronous Task Queue (Celery + Redis)**:
   - **Celery**: A distributed task execution worker pool. Evaluation modules require considerable computation that would freeze a standard Flask sequential pipeline. Celery receives these long-running tasks and processes them asynchronously in background operating system threads.
   - **Redis**: Acts as the high-throughput, in-memory message broker. When a user clicks "Run Benchmark", the Flask backend writes a task request packet into Redis. Celery workers poll Redis to pull incoming tasks, process them, and write progress metrics back to Redis for the frontend to read.

### Key Design Decisions
 - **Dynamic Container Isolation**: Each benchmark module is built on top of an pre-built (CUDA- or CPU-only) base layer and spun up inside an isolated Docker container. This safeguards the host environment and dependencies, as well as allows for concurrent evaluation execution.
 - **Asynchronous Execution Loop**: Long-running deep learning evaluations and third-party SMTP email updates are fully decoupled from the core Flask HTTP request lifecycle using an asynchronous Celery broker pattern.

## Repository Structure

```
PrivBench/
├── backend/                  # Flask REST API application layer
│   ├── app/
│   │   ├── enums/            # System state enumeration definitions
│   │   ├── models/           # DB Schemas 
│   │   ├── routes/           # REST Controller Endpoints
│   │   ├── services/         # Core Business Logic
│   │   ├── tasks/            # Celery Asynchronous Workers & Docker execution hooks
│   │   └── utils/            # Shared Utilities 
│   └── migrations/           # Alembic Database Migration Tracking Scripts
├── frontend/                 # User Interface Panel
│   ├── public/               # Static Web Assets
│   └── src/
│       ├── Theme/            # Global custom MUI Joy Style mappings
│       ├── components/       # Design Components 
│       ├── contexts/         # React Shared Context Global States
│       └── pages/            # Application Views
├── benchmarks/               # Base benchmark files
├── base_images/              # Dockerfiles for base module images
├── modules/                  # Core benchmark module implementations (and requirements files)
├── data/                     
│   ├── datasets/             # Clean baseline reference texts (e.g., yelp, imdb)
│   └── privatized/           # User/Method submitted anonymized variations
└── scripts/                  # Scripts for replicating text privatization runs
```

## Getting Started (Replication & Deployment)

### Prerequisites
Ensure the following tools are globally configured on your host environment:

- Docker & Docker Compose V2
- NVIDIA Container Toolkit

### Environment Configuration
Create a `.env` file in the repository root directory to store system variables safely:

```
# Database Credentials
POSTGRES_USER=admin
POSTGRES_PASSWORD=your_secure_db_password
POSTGRES_DB=privbench

# Communication
FRONTEND_URL=URL
REACT_APP_API_URL=URL/api
FLASK_APP=app
JWT_SECRET_KEY=XXX

# Hugging Face Access
HF_TOKEN=hf_your_access_token_here

# Outgoing Mail SMTP Credentials (e.g., web.de / GMX)
MAIL_USERNAME=EMAIL_ADDRESS
MAIL_PASSWORD=your_smtp_generated_app_password
MAIL_DEFAULT_SENDER=EMAIL_ADDRESS
MAIL_SERVER=SERVER_ADDRESS
MAIL_PORT=587
MAIL_USE_TLS=1
```

### Build and Deployment Pipeline
Execute the following deployment sequence to initialize data directories, compile images, and warm up the container grid:

```
./base_images/build_base.sh

docker compose build

docker compose up -d
```

### Additional Information

- **Docker Compose**: The `docker-compose.yml` file defines the services and their configurations, including environment variables, volumes, and dependencies. You may need to configure these to your setup!
- **Environment Variables**: Likewise, take care to set your `.env` file correctly to your setup.

For more detailed information on each component, refer to the respective directories and files in the project repository.


## Licensing, Terms, & Privacy Policy
PrivBench operates under a dual-licensing framework to encourage open-source community contributions to the underlying architecture while maintaining the scientific integrity of the hosted platform.

### Software Core License (MIT)
The core codebase, container orchestrators, CLI tools, evaluation scaffolding, and utility microservices contained within this repository are released under the MIT License.

 - **What this means**: You are completely free to fork this repository, modify the orchestration layers, add proprietary evaluation modules, and deploy your own private benchmarking instances for commercial or academic research without restriction.

### Web Application & Platform Content (CC BY-NC-ND 4.0)
The public web portal instance running at [privbench.com](https://privbench.com), along with its official leaderboard records, is protected under the Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International license.

 - Attribution (BY): You must give appropriate credit and provide a link to the original benchmark if you reference PrivBench scores or data charts in academic publications. 
 - Non-Commercial (NC): You may not use the official platform results or public leaderboard content for commercial advertising or proprietary product placement.
 - No Derivatives (ND): If you remix, transform, or build upon the specific data or visualizations hosted on the live web portal, you may not distribute the modified material as official PrivBench metrics.

### Data Privacy & Terms of Service (ToS)
On the public website, we clearly state our Privacy Policy and Terms of Service, in order to main compliance with data protection regulations, as well as to remain transparent about the operation of the public, free-to-use web application.

For details please review the Privacy Policy and Terms of Service links found in the footer of the live web application at [privbench.com](https://privbench.com).