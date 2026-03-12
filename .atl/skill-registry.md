# Skill Registry - route-flow

## Project-Level Skills
(No project-level skills detected)

## Global Skills (from ~/.config/opencode/skills/)

### SDD Workflow Skills
| Skill | Description | Trigger |
|-------|-------------|---------|
| sdd-init | Initialize SDD context in a project | "sdd init", "iniciar sdd", "openspec init" |
| sdd-explore | Explore and investigate ideas | /sdd-explore |
| sdd-propose | Create change proposal | Used by sdd-new |
| sdd-spec | Write specifications | Used by sdd-ff |
| sdd-design | Create technical design | Used by sdd-ff |
| sdd-tasks | Break down into tasks | Used by sdd-ff |
| sdd-apply | Implement SDD tasks | /sdd-apply |
| sdd-verify | Validate implementation | /sdd-verify |
| sdd-archive | Archive completed change | /sdd-archive |

### Other Skills
| Skill | Description | Trigger |
|-------|-------------|---------|
| skill-creator | Create new AI agent skills | Creating new skills |
| go-testing | Go testing patterns | Go tests |

## Commands Available
- /sdd-init → sdd-init
- /sdd-new → sdd-new (workflow: explore → propose)
- /sdd-explore → sdd-explore (skill)
- /sdd-apply → sdd-apply (skill)
- /sdd-verify → sdd-verify (skill)
- /sdd-archive → sdd-archive (skill)
- /sdd-continue → sdd-continue (workflow)
- /sdd-ff → sdd-ff (fast-forward: propose → spec → design → tasks)

## Notes
- Skills resolved from: ~/.config/opencode/skills/
- Commands defined in: .opencode/commands/
- Artifact store: engram (SDD artifacts persist to Engram)
