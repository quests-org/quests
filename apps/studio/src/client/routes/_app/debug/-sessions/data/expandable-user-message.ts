import { registerSession, SessionBuilder } from "../helpers";

const builder = new SessionBuilder();

const userMessage = builder.userMessage(
  `Should not be expandable - cut this image up into the following layers:
- the foreground tree`,
);

const assistantMessage = builder.assistantMessage(
  "I'll help you separate this image into distinct layers. Let me create each layer as a separate PNG file with the same dimensions as the original.",
);

const userMessage2 = builder.userMessage(
  `Should be expandable - configure the build system with these requirements:
- enable TypeScript strict mode and all strict checks
- add ESLint with recommended rules and custom overrides
- configure Prettier for consistent code formatting
- setup Vitest for comprehensive unit testing
- add Playwright for end-to-end testing coverage
- configure CI/CD pipeline with automated deployments
- setup pre-commit hooks for linting and formatting`,
);

const assistantMessage2 = builder.assistantMessage(
  "I'll help you configure all of these build system requirements. Let me start by setting up the TypeScript configuration.",
);

registerSession({
  messages: [userMessage, assistantMessage, userMessage2, assistantMessage2],
  name: "Expandable User Message",
});
