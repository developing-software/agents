# Dev Agents

Platform-orchestrated AI development lifecycle for brownfield projects. Agents implement focused tasks from approved plans while the platform provides orchestration, observability, and human-in-the-loop gates at every stage.

Inspired by the [AIDLC](https://github.com/awslabs/aidlc-workflows) framework, adapted for monorepo workflows, atomic tasks, and external platform control.

## Vision

```
+------------------------------------------------------------------+
|               Dev Agents - AI Development Lifecycle               |
|                                                                   |
|  Platform-orchestrated, brownfield-focused, observable            |
|  Atomic tasks from approved plans, multi-agent evaluation         |
+------------------------------------------------------------------+

  +-------------+     +----------------+     +-------------------+
  |  INCEPTION  | --> |  CONSTRUCTION  | --> |      REVIEW       |
  |  (Platform) |     |    (Agents)    |     | (LLM + Humans)    |
  +-------------+     +----------------+     +-------------------+
        |                    |                       |
        v                    v                       v
  +-----------+        +-----------+           +-----------+
  | Triage    |        | Dispatch  |           | LLM Judge |
  | Validate  |        | Execute   |           | PR Review |
  | Plan/PRD  |        | Collect   |           | Merge     |
  +-----------+        +-----------+           +-----------+
        |                    |                       |
        +--------------------+-----------------------+
                               |
                               v
                +-----------------------------+
                |        OBSERVABILITY        |
                |  Console + Events + Metrics |
                +-----------------------------+
```

## Lifecycle Phases

### Phase 1: Inception (Platform-Orchestrated)

Issues are triaged, validated, and grouped into plans. Plans can be authored by humans, drafted by an LLM agent, or both. Nothing reaches an implementation agent without an approved plan.

```
+----------------------------------------------------------------------+
|                  INCEPTION PHASE (Platform-Orchestrated)              |
+----------------------------------------------------------------------+

  GitHub Issues
  (bug, feature, task)
        |
        v
  +----------------------+
  |    ISSUE TRIAGE      |
  |                      |
  |  - Classification    |
  |  - Scope estimate    |
  |  - Validation        |
  |  - Dedup check       |
  +----------------------+
        |
        | platform groups
        | issues into plan
        v
  +----------------------+      +----------------------+
  |  LLM PLAN AGENT      |      |   HUMAN AUTHOR       |
  |                      |      |                      |
  |  - Draft/edit plan   |      |  - Create plan       |
  |  - Link issues       |      |  - Full control      |
  |  - Scope definition  |      |  - Rich context      |
  |  - Acceptance        |      |  - Link issues       |
  |    criteria          |      |                      |
  +----------------------+      +----------------------+
        |                              |
        +---------------+--------------+
                        |
                        v
              +----------------------+
              |    HUMAN REVIEW      |
              |                      |
              |  - Edit draft        |
              |  - Approve / reject  |
              |  - Refine scope      |
              +----------------------+
                        |
                        | approved
                        v
              +----------------------+
              |   APPROVED PLAN      |
              |                      |
              |  - Linked issues     |
              |  - Clear scope       |
              |  - Acceptance        |
              |    criteria          |
              |  - Agent-ready       |
              |    prompt            |
              +----------------------+
                        |
                        v
                  CONSTRUCTION -->
