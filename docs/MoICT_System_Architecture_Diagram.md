# e-SITREP System — System Architecture Diagram
**Ministry of ICT and National Guidance (MoICT&NG)**
**Government Systems Prototype Showcase Submission**

---

The diagram below visualizes the primary components of the e-SITREP system, demonstrating the flow of data from the end-user interface down to the database and external integrations.

```mermaid
flowchart TD
    %% Define Styles
    classDef client fill:#f9f9f9,stroke:#333,stroke-width:2px;
    classDef backend fill:#e1f5fe,stroke:#0288d1,stroke-width:2px;
    classDef db fill:#e8f5e9,stroke:#388e3c,stroke-width:2px;
    classDef external fill:#fff3e0,stroke:#f57c00,stroke-width:2px;

    subgraph Clients ["1. Frontend / User Interface (Browser)"]
        UI_Station["Station Portal\n(Border Officers)"]:::client
        UI_HQ["HQ Dashboard\n(Reviewers & Approvers)"]:::client
        UI_Admin["Admin Console\n(System Administrators)"]:::client
    end

    subgraph AppLayer ["2. Backend / Application Layer (Next.js)"]
        Auth["NextAuth Middleware\n(Authentication & Sessions)"]:::backend
        RBAC["RBAC Engine\n(Role-Based Access Control)"]:::backend
        API["REST API Routes\n(/api/*)"]:::backend
        Domain["Domain Logic & Services\n(Workflow, Exports, Audit)"]:::backend
        
        API --> Auth
        Auth --> RBAC
        RBAC --> Domain
    end

    subgraph DBLayer ["3. Database Layer"]
        Prisma["Prisma ORM\n(Data Access Layer)"]:::db
        DB[("PostgreSQL Database\n(Encrypted at Rest)")]:::db
        
        Prisma --> DB
    end
    
    subgraph External ["4. External APIs & Integrations"]
        Ext_Countries["REST Countries API\n(ISO Data)"]:::external
        Ext_Gov["Future Gov Integrations\n(NIRA, MIDAS, PISCES)"]:::external
    end

    %% Client to App Layer connections
    UI_Station -- "HTTPS (TLS)\nJSON payload" --> API
    UI_HQ -- "HTTPS (TLS)\nJSON payload" --> API
    UI_Admin -- "HTTPS (TLS)\nJSON payload" --> API

    %% Internal App Layer to DB
    Domain -- "TCP/TLS\nSQL queries" --> Prisma

    %% App Layer to External
    Domain -- "HTTPS" --> Ext_Countries
    Domain -. "HTTPS (Planned)" .-> Ext_Gov
```
