# Realignment Plan: SMB Manufacturing Intelligence Platform

## Objective

To realign the current project scope, maintain a focused vision, and ensure delivery of a minimum viable product (MVP) that fills a validated market gap without scope creep.

## Ultimate Goal

To become the default intelligence layer for SMB manufacturers by offering an ISO-compliant, AI-powered analytics platform that augments—not replaces—ERP and SCADA systems.

---

## Market Positioning & Alignment

### Current Market Context

* **Trend:** SMB manufacturers are increasingly adopting ERP (e.g., SAP Business One, Dynamics 365) and SCADA (e.g., Ignition) systems.
* **Gap:** These tools do not naturally communicate or generate contextual insights—there is no intelligence layer connecting ERP and operational data.
* **Opportunity:** Provide a lightweight analytics bridge that interprets, contextualizes, and augments existing data assets with AI insights.

### Competitor Landscape

| Competitor          | Focus                      | Weakness                       | Your Advantage                               |
| ------------------- | -------------------------- | ------------------------------ | -------------------------------------------- |
| Tulip.co            | No-code apps for operators | Requires heavy configuration   | Plug-and-play AI with prebuilt logic         |
| Ignition + Sepasoft | SCADA + MES analytics      | Lacks ISO compliance, no AI    | ISO schema + predictive intelligence         |
| Microsoft Power BI  | BI for Dynamics + SAP      | Needs expert setup, no context | Contextual, conversational interface         |
| Seeq                | Time-series analytics      | Expensive, focused on process  | Affordable, built for discrete manufacturing |

### Strategic Positioning

* **Target User:** Plant managers, reliability engineers, operations leads in SMB discrete manufacturing.
* **Scope:** Complement ERP/MES/SCADA, not replace.
* **Deployment:** SaaS and air-gapped options with <2 week time-to-value.
* **Use Case Anchor:** Solve OEE loss and downtime root causes.

---

## Phase 1: POC Development (0–60 Days)

### Goal

Deliver a functional proof of concept (POC) that demonstrates:

* Real-time and historical data ingestion
* Canonical mapping to an ISO-compliant data model
* Core dashboards for OEE, downtime, and quality
* Conversational AI interface for key queries

### Deliverables

* Connectors for SAP Business One, Dynamics, and Ignition
* Pre-loaded test data for SAP ECC/S4 and Ignition simulation
* Sample field mappings to canonical entities like `ProductionOrder`, `Equipment`, and `QualityNotification`
* 3–5 AI use cases (e.g., "Why did we miss our OEE target yesterday?")

### Integration Realism

For SAP Business One and Ignition, use:
* **Simulated API payloads (JSON files)** to emulate production orders and machine states
* **A CLI-based integration test harness** to validate transformations and ingestion before API implementation

### Testing

* Test performance and insight accuracy
* Validate against benchmark datasets and simulated ERP payloads
* Confirm support for multiple ERP versions and messaging patterns (API, file drop, OPC-UA, MQTT)

### Step 1: Define MVP Boundaries

**AI will be limited to predefined question categories with bounded context** (e.g., OEE summary, downtime contributors). Natural language flexibility will be added only after verifying data accuracy and user trust.

### 🛑 What We Will NOT Build in Phase 1

* Live sensor streaming
* Advanced root cause ML models
* Multi-tenancy
* Cross-site benchmarking
* Custom report builders
* Mobile applications
* Real-time alerting engine
* Predictive maintenance ML

---

## Phase 2: Pilot & Feedback (60–120 Days)

### Goal

Validate with real manufacturers using live or historical datasets.

### Activities

* Deploy POC to 2–3 pilot customers
* Use structured interviews and usage telemetry to gather insights
* Track feedback by role: Operator, Process Engineer, Plant Manager
* Measure: OEE lift, downtime reduction, AI suggestion adoption rate

### Adjustments

* Realign based on pilot feedback: data model, UI/UX, key AI use cases
* Prioritize integrations and metrics that solve urgent plant-level problems

### 🛑 What We Will NOT Build in Phase 2

* Additional ERP connectors beyond pilot needs
* Complex workflow automation
* Integration with financial systems
* Custom KPI builders
* API marketplace
* White-label capabilities

---

## Phase 3: Market-Ready Platform (120–180 Days)

### Goal

Convert pilot into a general release product.

### Features

* Multi-workcenter support
* Secure tenant-based multi-instance architecture
* Role-based AI agent suggestions
* Audit trail logging and reporting
* Edge-to-cloud deployment option

### Business Logic

* Refine canonical mappings to support more ERP schemas
* Add alerting, benchmarking, and OEE trend prediction modules

### 🛑 What We Will NOT Build in Phase 3

* Full MES replacement functionality
* Supply chain optimization
* ERP data writeback
* Complex scheduling algorithms
* Industry-specific verticals (pharma, food)
* Blockchain traceability

---

## Guardrails Against Scope Creep

| Area     | What to Include                            | What to Exclude                              |
| -------- | ------------------------------------------ | -------------------------------------------- |
| Data     | Canonical data model, key ERP/SCADA fields | Raw sensor ingestion, historian replacements |
| Features | Conversational AI, OEE & downtime          | MES execution, inventory management          |
| Market   | SMB discrete manufacturers                 | Large enterprises, process industries        |
| Delivery | Fast deploy (<2 weeks), SaaS or air-gapped | On-premise ERP migrations or MES overlays    |

---

## Key Tools

* **Database:** PostgreSQL via Prisma
* **AI Layer:** OpenAI GPT or Ollama for local inference
* **Visualization:** Recharts, custom dashboards
* **Integration:** ERP connectors, OPC-UA/MQTT for SCADA

---

## Metrics for Continuous Alignment

* Time to value for pilot customers
* OEE improvement % within 90 days
* AI adoption (queries, actions taken)
* Pilot-to-paid conversion ratio
* Feature requests mapped to roles and ROI

---

## Execution Model for Reality-Based Progression

### Step 1: Define MVP Boundaries (Now)

* Write down only the must-have features to prove concept value
* Examples: OEE dashboard, downtime analysis, 3 AI conversations
* **AI Constraint:** Limited to predefined question categories with bounded context

### Step 2: Build the POC with Realistic Scope (0–60 Days)

* No full system: only one ERP integration, one SCADA mockup, basic AI interface
* Use simulated payloads and test harness for rapid iteration

### Step 3: Pilot & Feedback Loop (60–120 Days)

* Validate outcomes, capture friction, adjust approach

### Step 4: Add Features Based on Real Feedback (120–180 Days)

* Avoid building based on assumptions—prioritize only user-validated features

### Step 5: Market Fit & Positioning Refresh (180+ Days)

* Revisit roadmap quarterly, eliminate features that go unused, double down on success metrics

---

## Conclusion

This plan restores project clarity by:

* Anchoring development around urgent, solvable problems (OEE, downtime)
* Delivering quickly through a narrow POC scope
* Using structured feedback to drive real-world fit
* Avoiding feature creep via strategic constraints and explicit "Don't Build" lists

With each phase, the product grows based on **validated market need**, not assumptions. This focused path ensures a differentiated, scalable analytics solution for SMB manufacturing.

---

## Project Readiness Assessment (Current State)

### Current Stack
- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Next.js API routes, Prisma ORM
- **Database:** PostgreSQL with ISO 22400-compliant schema
- **AI Layer:** Ollama (Gemma 2B) for air-gapped, Manufacturing Engineering Agent
- **Visualization:** Recharts, custom manufacturing dashboards
- **Real-time:** SSE for streaming updates

### What's Built

| Feature | Status | Working | Notes |
| ------- | ------ | ------- | ----- |
| ISO 22400 Schema | ✅ Complete | Yes | Hierarchical fact tables, dimension tables |
| OEE Calculations | ✅ Complete | Yes | Real-time with Decimal precision fixes |
| Manufacturing Agent | ✅ Complete | Yes | Downtime, quality, OEE analysis |
| Fast Query Processor | ✅ Complete | Yes | 28ms response time (600x improvement) |
| Equipment Mapping | ✅ Complete | Yes | Code-to-UUID resolution |
| Streaming Updates | ✅ Complete | Yes | Lazy initialization fixes applied |
| Auth System | ⚠️ Partial | Yes | Basic JWT, needs RBAC |
| Dashboards | ⚠️ Partial | Yes | OEE, production, needs polish |
| ERP Integration | ❌ Placeholder | No | Connector framework only |
| SCADA Integration | ❌ Placeholder | No | MQTT/OPC-UA stubs |

### Data Sources (Current)
- **Active:** Seeded PostgreSQL with manufacturing test data
- **Planned:** SAP Business One, Dynamics 365, Ignition SCADA
- **Sample Data:** ISO-compliant equipment states, OEE metrics, quality data

### CDM Mapping (Implemented)
```typescript
// Current canonical entities
- Equipment (id, code, name, type, workCenter)
- FactOeeMetric (timestamp, availability, performance, quality)
- FactEquipmentState (timestamp, state, duration, category)
- FactQualityMetric (parameter, value, isWithinSpec)
- FactMaintenanceEvent (type, duration, cost)
- WorkCenter → ManufacturingArea → ManufacturingSite
```

### AI Use Cases (Implemented)
1. **"What is my largest downtime contributor?"** ✅
2. **"Show me OEE for all equipment"** ✅
3. **"Why did we miss our quality targets?"** ✅
4. **"Which equipment needs maintenance?"** ⚠️
5. **"Predict next failure"** ❌ (Excluded from Phase 1)

### Sample AI Output (Actual)
```markdown
## Downtime Analysis Results (ISO 14224:2016 Compliant)

🚨 **Major Downtime Contributor**: CNC Machine 3
- **Total Downtime**: 245.5 minutes
- **Impact**: 68.2% of total downtime

### Top Contributors (Pareto Analysis):
1. **CNC Machine 3**: 245.5 min (68.2%)
2. **Welding Robot A**: 78.3 min (21.7%)
3. **Paint Booth 1**: 36.2 min (10.1%)

### Immediate Actions Required:
1. **Prioritize**: Address CNC Machine 3 immediately
2. **Investigate**: Review maintenance history
3. **Prevent**: Implement predictive maintenance
```

### Integration Readiness
- **API Framework:** ✅ Ready (Next.js routes)
- **File Drop:** ❌ Not implemented
- **MQTT:** ❌ Stub only
- **OPC-UA:** ❌ Not started
- **Webhook:** ⚠️ Basic structure

### Security & Compliance
- **ISO 22400:** ✅ Schema compliant
- **Air-gapped:** ✅ Ollama local AI
- **Multi-tenant:** ❌ Single instance only
- **RBAC:** ❌ Basic auth only
- **Audit Trail:** ❌ Not implemented

---

## Immediate Actions for Phase 1 POC (Next 30 Days)

### Week 1-2: Core Stabilization
1. **Fix remaining UI issues**
   - Complete OEE trend visualizations
   - Add drill-down from KPI to details
   - Implement responsive design

2. **Enhance Manufacturing Agent**
   - Add maintenance prediction logic (basic rules only)
   - Implement production rate analysis
   - Create fishbone diagram for RCA

### Week 3-4: Integration & Demo Data
1. **Build SAP Business One Connector**
   - Mock API endpoints with JSON payloads
   - Sample production order mapping
   - Quality notification ingestion
   - CLI test harness for validation

2. **Create Ignition SCADA Simulator**
   - Generate realistic sensor data files
   - Implement tag structure
   - Add OPC-UA server mock

3. **Demo Scenarios**
   - Pre-load 30 days of realistic data
   - Script common failure patterns
   - Create guided demo flow

---

## Risk Mitigation

| Risk | Mitigation |
| ---- | ---------- |
| ERP integration complexity | Start with file-based import, add APIs later |
| AI hallucinations | Constrain to fact-based queries, add confidence scores |
| Performance at scale | Implement time-series partitioning early |
| Security concerns | Document air-gap deployment, add audit logs |

---

## Success Criteria for POC

1. **Performance:** <100ms query response, <5s dashboard load
2. **Accuracy:** 95%+ correct OEE calculations vs manual
3. **Usability:** Plant manager can find root cause in <3 clicks
4. **Integration:** Successfully import 1 week of ERP data
5. **AI Value:** 80%+ relevant responses to manufacturing queries

---

## Next Steps

1. **Today:** Commit all fixes, create POC branch
2. **Week 1:** Complete UI polish and agent enhancements
3. **Week 2:** Build first ERP connector with sample data
4. **Week 3:** Create demo environment and scenarios
5. **Week 4:** Internal testing and performance optimization

This positions us to deliver a focused POC that demonstrates real value without scope creep, ready for pilot customer validation.