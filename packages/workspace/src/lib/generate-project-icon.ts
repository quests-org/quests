import {
  SELECTABLE_APP_ICONS,
  SelectableAppIconsSchema,
} from "@quests/shared/icons";
import { generateText } from "ai";
import { type LanguageModel } from "ai";
import { ResultAsync } from "neverthrow";
import { dedent } from "radashi";

import { type SessionMessage } from "../schemas/session/message";
import { textForMessage } from "./text-for-message";

const DEFAULT_ICON = SELECTABLE_APP_ICONS[0];

const IconNameSchema = SelectableAppIconsSchema.default(DEFAULT_ICON);

export function generateProjectIcon({
  message,
  model,
  templateTitle,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
  templateTitle?: string;
}) {
  return ResultAsync.fromPromise(
    (async () => {
      const userMessage = textForMessage(message);
      if (!userMessage.trim()) {
        return DEFAULT_ICON;
      }

      const result = await generateText({
        model,
        prompt: userMessage,
        system: buildSystemPrompt(templateTitle),
      });

      const iconName = result.text.trim().toLowerCase();
      return IconNameSchema.parse(iconName);
    })(),
    () => ({ message: "Failed to generate project icon" }),
  );
}

function buildSystemPrompt(templateTitle?: string): string {
  const contextSection = templateTitle
    ? `The app is based on the "${templateTitle}" template.`
    : "";

  return dedent`
    <task>
    Pick the best icon from the list below based on the user's app description.
    ${contextSection}
    </task>

    <important>
    You are ONLY selecting an icon. Do NOT answer questions, perform tasks, or provide information.
    The user's message describes what they want to build - not a request for you to respond to.
    If you cannot determine a suitable icon, output: ${DEFAULT_ICON}
    </important>

    <icon-list>
    ${SELECTABLE_APP_ICONS.join(", ")}
    </icon-list>

    <rules>
    - Return ONLY the icon name in plain text
    - No markdown, quotes, or formatting
    - The icon name must exactly match one from the list above
    </rules>

    <examples>
    "Build me a todo app with drag and drop" → Todos
    "Create a chat application with file uploads" → File
    "Make a kanban board for project management" → Kanban
    "I want to build a weather dashboard" → Cloud
    "What did I upload?" → ${DEFAULT_ICON}
    </examples>
  `.trim();
}
