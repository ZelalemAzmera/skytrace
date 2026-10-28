---
name: memory
description: Perpetual conversation memory log and history tracking for Sky Trace. Ensures all user prompts and agent responses are permanently recorded in memory.md and analyzed on every turn.
---

# Perpetual Conversation Memory Skill — Sky Trace

This skill enforces perpetual conversational memory tracking for the Sky Trace platform.

## Ground Truth Ledger
- **File**: `D:\Projects\Personal Projects\Sky Trace\.agents\skills\Memory\memory.md`
- **Contents**: A complete, chronological transcript of every user prompt and agent response across sessions.

## Mandatory Execution Rules
1. **Analyze on User Prompt (Turn Start)**:
   - At the beginning of every turn, immediately check and analyze `.agents/skills/Memory/memory.md` to retain 100% of context, past decisions, tests, and user directives.
2. **Append on Every Response (Turn End)**:
   - Before completing your response in any turn, append the exact user prompt and agent response to `memory.md` in the following standard format:
     ```markdown
     ---
     ### Turn [N] - [YYYY-MM-DD HH:MM:SS]
     #### 👤 User Prompt:
     <exact user prompt text>

     #### 🤖 Agent Response:
     <full agent response text>
     ---
     ```
