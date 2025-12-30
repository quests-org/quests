import { readdirSync, rmSync, statSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";

const questsPath = path.join(homedir(), "Library", "Application Support");

const DATED_DEV_FOLDER_PATTERN = /^Quests \(Dev \((\d+)\)\)$/;

function findDatedDevFolders(): {
  name: string;
  path: string;
  size: number;
  timestamp: number;
}[] {
  try {
    const entries = readdirSync(questsPath, { withFileTypes: true });
    const folders = [];

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      const match = DATED_DEV_FOLDER_PATTERN.exec(entry.name);
      if (match) {
        const folderPath = path.join(questsPath, entry.name);
        const stats = statSync(folderPath);
        const timestamp = Number.parseInt(match[1] ?? "0", 10);

        folders.push({
          name: entry.name,
          path: folderPath,
          size: stats.size,
          timestamp,
        });
      }
    }

    folders.sort((a, b) => b.timestamp - a.timestamp);

    return folders;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      console.log(`No Quests folder found at: ${questsPath}`);
      return [];
    }
    throw error;
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

async function main() {
  console.log("🔍 Searching for dated developer folders...\n");
  console.log(`Looking in: ${questsPath}\n`);

  const folders = findDatedDevFolders();

  if (folders.length === 0) {
    console.log("✅ No dated developer folders found.");
    return;
  }

  console.log(`Found ${folders.length} dated developer folder(s):\n`);

  for (const [index, folder] of folders.entries()) {
    console.log(`${index + 1}. ${folder.name}`);
    console.log(`   Created: ${formatDate(folder.timestamp)}`);
    console.log(`   Path: ${folder.path}`);
    console.log("");
  }

  const answer = await promptUser(
    `\n⚠️  Do you want to delete all ${folders.length} folder(s)? (y/N): `,
  );

  if (answer !== "y" && answer !== "yes") {
    console.log("\n❌ Deletion cancelled.");
    return;
  }

  console.log("\n🗑️  Deleting folders...\n");

  let deletedCount = 0;
  for (const folder of folders) {
    try {
      rmSync(folder.path, { force: true, recursive: true });
      console.log(`✓ Deleted: ${folder.name}`);
      deletedCount++;
    } catch (error) {
      console.error(`✗ Failed to delete ${folder.name}:`, error);
    }
  }

  console.log(
    `\n✅ Successfully deleted ${deletedCount} of ${folders.length} folder(s).`,
  );
}

async function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase();
}

await main();
