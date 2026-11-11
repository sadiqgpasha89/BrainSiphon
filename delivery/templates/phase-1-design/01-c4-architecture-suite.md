# Standard C4 Architecture Model Suite (System Design Deliverable)

**Document Code:** `BS-TMPL-DESIGN-01`  
**Phase:** Phase 1 — Architecture & Design (Step 1.1)  

---

## 1. C4 Level 1: System Context Diagram
Shows the system in scope, its external human users, and external system dependencies.

```mermaid
flowchart TD
  subgraph Enterprise Boundaries
    User["End Customer / User<br>[Person]"]
    Analyst["Operations Analyst<br>[Person]"]
    
    subgraph BrainSiphon Solution Boundary
      AISystem["AI Decisioning Platform<br>[Software System]<br>Evaluates events in real-time, serves scores, and routes high-risk cases"]
    end
    
    CoreApp["Core Business Application<br>[Software System]<br>System of record, payment core, or ERP"]
    AuthServer["Enterprise Identity Provider<br>[Software System]<br>OAuth2 / OIDC SSO"]
    Warehouse["Corporate Data Lakehouse<br>[Software System]<br>Snowflake / Databricks / Iceberg"]
  end
  
  User -->|Submits action| CoreApp
  CoreApp -->|Invokes scoring API (sub-15ms)| AISystem
  AISystem -->|Returns score & disposition| CoreApp
  AISystem -->|Routes ambiguous cases| Analyst
  Analyst -->|Confirms / Overrides| AISystem
  AISystem -.->|Syncs raw events & decisions| Warehouse
  AISystem -.->|Validates tokens| AuthServer
```

---

## 2. C4 Level 2: Container Diagram
Shows the high-level technical building blocks (containers, web apps, databases, queues).

```mermaid
flowchart TD
  subgraph Client Microservices
    Gateway["API Gateway / Core Service<br>[Kong / Envoy]"]
  end

  subgraph AI Decision Platform
    API["Inference Serving API<br>[FastAPI / Python]<br>Port 8000 · P99 &lt; 15ms"]
    Worker["Async Event Consumer<br>[Faust / Celery]<br>Consumes streaming topics"]
    FeatureStore["Online Feature Store<br>[Redis Cluster]<br>P99 &lt; 3ms key-value lookup"]
    DB["Decisions WAL Ledger &amp; Config<br>[PostgreSQL 16 + pgvector]"]
    Queue["Review Queue Web App<br>[Next.js 15 + React]"]
  end

  subgraph Infrastructure Fabric
    Kafka["Event Streaming Fabric<br>[Kafka / Redpanda Cluster]"]
    S3["Model Registry &amp; Offline Store<br>[AWS S3 / GCP GCS + MLflow]"]
  end

  Gateway -->|POST /v1/score| API
  API -->|Fetch entity features| FeatureStore
  API -->|Write decision record| DB
  API -->|Emit audit event| Kafka
  Kafka -->|Consume events| Worker
  Worker -->|Update streaming aggregates| FeatureStore
  DB -->|Fetch pending alerts| Queue
  API -.->|Load model artifact| S3
```

---

## 3. C4 Level 3: Component Diagram (Inside Inference Serving API)
Shows the internal software components, interfaces, and degradation ladders.

```mermaid
flowchart TD
  subgraph "Inference Serving API Container (FastAPI)"
    Router["REST API Router<br>[FastAPI / Pydantic]"]
    Auth["JWT / Token Validator<br>[PyJWT / Cryptography]"]
    Enricher["Feature Enricher<br>[Async Redis Client]"]
    Scorer["Model Scoring Engine<br>[ONNX Runtime / LightGBM]"]
    Breaker["Circuit Breaker &amp; Timeout<br>[12ms hard deadline]"]
    Fallback["Heuristic Fallback Engine<br>[Deterministic Rules]"]
    LedgerWriter["Async WAL Ledger Writer<br>[SQLAlchemy Async / Background Task]"]
  end

  Router --> Auth
  Auth --> Enricher
  Enricher --> Breaker
  Breaker -->|Nominal Path| Scorer
  Breaker -->|Timeout &gt; 12ms / Crash| Fallback
  Scorer --> LedgerWriter
  Fallback --> LedgerWriter
```

---

## 4. C4 Level 4: Deployment Topology Diagram
Shows the physical and cloud infrastructure mapping (Kubernetes nodes, multi-AZ, security boundaries).

```mermaid
flowchart TD
  subgraph "Cloud Provider (AWS / GCP / Azure) — VPC (10.0.0.0/16)"
    subgraph "Public Subnet (DMZ)"
      ALB["Application Load Balancer<br>[TLS Termination · Port 443]"]
    end
    
    subgraph "Private App Subnet (Multi-AZ)"
      subgraph "Availability Zone A"
        PodA1["Inference Pod 1<br>[CPU: 2 Core, RAM: 4GB]"]
        PodA2["Inference Pod 2"]
      end
      subgraph "Availability Zone B"
        PodB1["Inference Pod 3<br>[CPU: 2 Core, RAM: 4GB]"]
        PodB2["Inference Pod 4"]
      end
    end
    
    subgraph "Private Data Subnet"
      RedisPrimary["Redis Primary<br>[ElastiCache Multi-AZ]"]
      RedisReplica["Redis Read Replica"]
      PGPrimary["PostgreSQL Primary<br>[RDS Multi-AZ]"]
      PGStandby["PostgreSQL Standby"]
    end
  end

  ALB --> PodA1
  ALB --> PodA2
  ALB --> PodB1
  ALB --> PodB2
  PodA1 & PodA2 & PodB1 & PodB2 --> RedisPrimary
  PodA1 & PodA2 & PodB1 & PodB2 --> PGPrimary
  RedisPrimary -.-> RedisReplica
  PGPrimary -.-> PGStandby
```

