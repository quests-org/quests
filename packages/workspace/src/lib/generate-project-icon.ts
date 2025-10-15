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
        throw new Error("No user message");
      }

      const result = await generateText({
        model,
        prompt: userMessage,
        system: buildSystemPrompt(templateTitle),
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

function buildSystemPrompt(templateTitle?: string): string {
  const contextSection = templateTitle
    ? `<context>
    You are picking an icon for an app based on the "${templateTitle}" template.
    </context>`
    : "";

  return dedent`<task>
    Pick the best icon name from <icon-list> the given app description.
    </task>

    ${contextSection}

    <icon-list>
    ${SELECTABLE_APP_ICONS.map((icon) => `- ${icon}`).join("\n")}
    </icon-list>

    <rules>
    Return ONLY the icon name in plain text format.
    No markdown, no quotes, no formatting, no extra details.
    Just the icon name, nothing else.
    </rules>

    <examples>
    Build a todo app → Todos
    Create a chat application with file uploads → File
    Make a kanban board for project management → Kanban
    </examples>
  `.trim();
}
