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

const IconNameSchema = SelectableAppIconsSchema.default(
  SELECTABLE_APP_ICONS[0],
);

const SYSTEM_PROMPT = dedent`<task>
    Pick the best icon name from <icon-list> the given app description.
    </task>

    <icon-list>
    ${SELECTABLE_APP_ICONS.map((icon) => `- ${icon}`).join("\n")}
    </icon-list>

    <rules>
    Return ONLY the icon name, nothing else.
    </rules>

    <examples>
    "Build a todo app" → "Todos"
    "Create a chat application with file uploads" → "File"
    "Make a kanban board for project management" → "Kanban"
    </examples>
  `.trim();

export function generateProjectIcon({
  message,
  model,
}: {
  message: SessionMessage.UserWithParts;
  model: LanguageModel;
}) {
  return ResultAsync.fromPromise(
    (async () => {
      const userMessage = textForMessage(message);
      if (!userMessage.trim()) {
        throw new Error("No user message");
      }

      const result = await generateText({
        model,
        prompt: userMessage,
        system: SYSTEM_PROMPT,
      });
      const iconName = result.text.trim();
      const icon = IconNameSchema.parse(iconName.trim().toLowerCase());
      return icon;
    })(),
    (error: unknown) => ({
      message: `Failed to generate project icon: ${error instanceof Error ? error.message : String(error)}`,
    }),
  );
}
