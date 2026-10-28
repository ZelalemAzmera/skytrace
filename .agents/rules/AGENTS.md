# Perpetual Conversation Memory Logging Rule

**CRITICAL MANDATORY INSTRUCTION — STRICTLY ENFORCED ACROSS ALL AGENTS AND SESSIONS**

For the Sky Trace project, you MUST maintain a perpetual conversation log of all interactions in:
`D:\Projects\Personal Projects\Sky Trace\.agents\skills\Memory\memory.md`

## 1. At the Start of Every Turn (User Prompt Analysis):
- Immediately check, read, and analyze `D:\Projects\Personal Projects\Sky Trace\.agents\skills\Memory\memory.md`.
- Ensure all past context, user constraints, architecture decisions, tests, and progress are preserved.

## 2. At the End of Every Turn (Turn Append):
- Every single time before you finish answering the user, you MUST append the exact conversation turn (the full user prompt and the agent's full response/actions summary) to `D:\Projects\Personal Projects\Sky Trace\.agents\skills\Memory\memory.md` in the following format:

```markdown
---
### Turn [N] - [YYYY-MM-DD HH:MM:SS]
#### 👤 User Prompt:
<exact user prompt text>

#### 🤖 Agent Response:
<full agent response and summary of actions taken>
---
```

## 3. Strict Non-Forgettable Constraint:
- Never skip updating `memory.md` under any circumstances.
- If the file does not exist, create it.
- This rule takes absolute precedence across all turns in this project.
