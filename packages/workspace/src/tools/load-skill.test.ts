import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { APP_FOLDER_NAMES, REGISTRY_FOLDER_NAMES } from "../constants";
import { AbsolutePathSchema, AppDirSchema } from "../schemas/paths";
import { ProjectSubdomainSchema } from "../schemas/subdomains";
import { createMockAIGatewayModel } from "../test/helpers/mock-ai-gateway-model";
import { createMockAppConfig } from "../test/helpers/mock-app-config";
import { runTool } from "../test/helpers/run-tool";
import { LoadSkill } from "./load-skill";

const model = createMockAIGatewayModel();

let tmpDir: string;
let appDir: string;
let registryDir: string;
let skillsDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "load-skill-test-"));
  appDir = path.join(tmpDir, "app");
  registryDir = path.join(tmpDir, "registry");
  skillsDir = path.join(registryDir, REGISTRY_FOLDER_NAMES.skills);
  await fs.mkdir(appDir, { recursive: true });
  await fs.mkdir(skillsDir, { recursive: true });
});

afterEach(async () => {
  await fs.rm(tmpDir, { force: true, recursive: true });
});

function baseExecuteArgs() {
  return {
    agentName: "main" as const,
    appConfig: createAppConfigWithDirs(),
    model,
    projectState: {},
    signal: AbortSignal.timeout(10_000),
    spawnAgent: vi.fn(),
  };
}

function createAppConfigWithDirs() {
  const base = createMockAppConfig(ProjectSubdomainSchema.parse("test"), {
    model,
  });
  return {
    ...base,
    appDir: AppDirSchema.parse(appDir),
    workspaceConfig: {
      ...base.workspaceConfig,
      registryDir: AbsolutePathSchema.parse(registryDir),
    },
  };
}

async function createSkill({
  description = "A test skill",
  extraFiles = {} as Record<string, string>,
  name,
}: {
  description?: string;
  extraFiles?: Record<string, string>;
  name: string;
}) {
  const skillDir = path.join(skillsDir, name);
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(
    path.join(skillDir, "SKILL.md"),
    `---\nname: ${name}\ndescription: "${description}"\n---\n\n# ${name}\n\nSkill instructions here.`,
  );
  for (const [relPath, content] of Object.entries(extraFiles)) {
    const fullPath = path.join(skillDir, relPath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
  }
}

/* eslint-disable unicorn/no-await-expression-member */
describe("LoadSkill", () => {
  it("returns not-found message when skill does not exist", async () => {
    await createSkill({ name: "existing-skill" });

    const result = (
      await runTool(LoadSkill, {
        ...baseExecuteArgs(),
        input: { explanation: "loading", name: "nonexistent" },
      })
    )._unsafeUnwrap();

    expect(result.content).toMatchInlineSnapshot(`
      "Skill "nonexistent" not found.

      Available skills:

      - existing-skill: "A test skill""
    `);
  });

  it("copies skill directory to .agents/skills/<name> on load", async () => {
    await createSkill({
      extraFiles: { "scripts/run.ts": "console.log('hello')" },
      name: "my-skill",
    });

    await runTool(LoadSkill, {
      ...baseExecuteArgs(),
      input: { explanation: "loading", name: "my-skill" },
    });

    const destBase = path.join(appDir, APP_FOLDER_NAMES.skills, "my-skill");
    const md = await fs.readFile(path.join(destBase, "SKILL.md"), "utf8");
    expect(md).toMatchInlineSnapshot(`
      "---
      name: my-skill
      description: "A test skill"
      ---

      # my-skill

      Skill instructions here."
    `);

    const script = await fs.readFile(
      path.join(destBase, "scripts", "run.ts"),
      "utf8",
    );
    expect(script).toMatchInlineSnapshot(`"console.log('hello')"`);
  });

  it("includes relative file paths in skill_files section", async () => {
    await createSkill({
      extraFiles: {
        "references/notes.md": "# Notes",
        "scripts/lib/helper.ts": "export const x = 1",
        "scripts/run.ts": "console.log('hello')",
      },
      name: "my-skill",
    });

    const result = (
      await runTool(LoadSkill, {
        ...baseExecuteArgs(),
        input: { explanation: "loading", name: "my-skill" },
      })
    )._unsafeUnwrap();

    expect(result.content).toMatchInlineSnapshot(`
      "<skill_content name="my-skill">
      # my-skill

      Skill instructions here.

      The skill files below are copied into your project and are yours to edit. Before writing anything new, read the relevant script(s) and run them with \`ts\` if they fit. Only write a custom script if the existing ones cannot handle the task even with modification. Scripts resolve all paths from your current working directory, so you can invoke them from anywhere.

      <skill_files>
      <file>skills/my-skill/references/notes.md</file>
      <file>skills/my-skill/scripts/lib/helper.ts</file>
      <file>skills/my-skill/scripts/run.ts</file>
      </skill_files>
      </skill_content>"
    `);
  });

  it("does not re-copy if destination already exists (idempotent)", async () => {
    await createSkill({
      extraFiles: { "scripts/run.ts": "original" },
      name: "my-skill",
    });

    const args = {
      ...baseExecuteArgs(),
      input: { explanation: "loading", name: "my-skill" },
    };

    await runTool(LoadSkill, args);

    const destScript = path.join(
      appDir,
      APP_FOLDER_NAMES.skills,
      "my-skill",
      "scripts",
      "run.ts",
    );

    await fs.writeFile(destScript, "modified");

    const result = (await runTool(LoadSkill, args))._unsafeUnwrap();

    const fileContent = await fs.readFile(destScript, "utf8");
    expect(fileContent).toMatchInlineSnapshot(`"modified"`);
    expect(result.content).toMatchInlineSnapshot(
      `"Skill "my-skill" is already loaded at skills/my-skill."`,
    );
  });

  it("returns skill content wrapped in skill_content tag", async () => {
    await createSkill({ name: "my-skill" });

    const result = (
      await runTool(LoadSkill, {
        ...baseExecuteArgs(),
        input: { explanation: "loading", name: "my-skill" },
      })
    )._unsafeUnwrap();

    expect(result.content).toMatchInlineSnapshot(`
      "<skill_content name="my-skill">
      # my-skill

      Skill instructions here.
      </skill_content>"
    `);
  });

  it("omits skill_files section when skill has no extra files", async () => {
    await createSkill({ name: "my-skill" });

    const result = (
      await runTool(LoadSkill, {
        ...baseExecuteArgs(),
        input: { explanation: "loading", name: "my-skill" },
      })
    )._unsafeUnwrap();

    expect(result.content).toMatchInlineSnapshot(`
      "<skill_content name="my-skill">
      # my-skill

      Skill instructions here.
      </skill_content>"
    `);
  });
});
/* eslint-enable unicorn/no-await-expression-member */
