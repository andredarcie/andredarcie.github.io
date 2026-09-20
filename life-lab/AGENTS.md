# AGENTS.md

## Highest-priority project rule

The human user is the only person allowed to test this project.

AI agents must never test, run, preview, launch, browse, automate, or otherwise validate the project. This includes, but is not limited to:

- Running unit, integration, end-to-end, browser, Playwright, lint, type-check, or build commands.
- Starting a development server or opening the project in a browser.
- Taking screenshots or inspecting rendered output as a test.
- Using automated interaction scripts or checking runtime console output.

The AI agent may inspect source files and make the requested implementation changes, but must stop after the implementation is complete. The agent must then ask the human user to test the project and report any issues. Do not claim that the project was tested or verified by the AI agent.

This rule has the highest priority among project-local instructions. It does not override system-level or platform-level instructions.

## Completion behavior

When the requested code changes are finished:

1. Summarize what was changed.
2. State clearly that the AI agent did not test the project.
3. Ask the human user to test it locally.
4. Wait for the human user's feedback before making further changes.
