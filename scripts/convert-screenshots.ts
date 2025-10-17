import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { createInterface } from "node:readline";

/* eslint-disable no-console */

interface ScreenshotFile {
  path: string;
  size: number;
}

function convertPngToJpg(pngPath: string, quality = 90): boolean {
  try {
    const jpgPath = pngPath.replace(".png", ".jpg");

    // Use ImageMagick to convert PNG to JPG with quality control
    execSync(`magick convert "${pngPath}" -quality ${quality} "${jpgPath}"`, {
      stdio: "inherit",
    });

    // Verify the conversion was successful
    if (existsSync(jpgPath)) {
      console.log(
        `✅ Successfully converted: ${pngPath} → ${jpgPath} (quality: ${quality}%)`,
      );
      return true;
    } else {
      console.error(`❌ Conversion failed: ${pngPath}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ Error converting ${pngPath}:`, error);
    return false;
  }
}

function findPngFiles(): ScreenshotFile[] {
  try {
    const result = execSync(
      'find . -name "*.png" -type f -not -path "*/node_modules/*" -not -path "*/public/*" -not -path "*/apps/studio/build/*" -not -path "*/.github/*"',
      {
        cwd: process.cwd(),
        encoding: "utf8",
      },
    );

    const files = result
      .trim()
      .split("\n")
      .filter((line) => line.length > 0)
      .map((path) => {
        const fullPath = path.startsWith("./") ? path.slice(2) : path;
        const stats = execSync(`stat -f%z "${fullPath}"`, { encoding: "utf8" });
        return {
          path: fullPath,
          size: Number.parseInt(stats.trim(), 10),
        };
      });

    return files;
  } catch (error) {
    console.error("Error finding PNG files:", error);
    return [];
  }
}

function formatFileSize(bytes: number): string {
  const sizes = ["B", "KB", "MB", "GB"];
  if (bytes === 0) {
    return "0 B";
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
}

async function main() {
  console.log("🔍 Searching for PNG files...\n");

  const pngFiles = findPngFiles();

  if (pngFiles.length === 0) {
    console.log("No PNG files found in the repository.");
    return;
  }

  console.log(`Found ${pngFiles.length} PNG file(s):\n`);

  // Display all files first
  for (const [index, file] of pngFiles.entries()) {
    console.log(`${index + 1}. ${file.path} (${formatFileSize(file.size)})`);
  }

  console.log();

  // Ask for JPEG quality
  const qualityInput = await promptUser(
    "Enter JPEG quality (1-100, default 90): ",
  );
  let quality = qualityInput ? Number.parseInt(qualityInput, 10) : 90;

  if (Number.isNaN(quality) || quality < 1 || quality > 100) {
    console.log("Invalid quality. Using default quality of 90%.");
    quality = 90;
  }

  console.log(`Using JPEG quality: ${quality}%\n`);

  // Ask for confirmation to proceed
  const proceed = await promptUser("Do you want to convert files? (y/N): ");
  if (proceed !== "y" && proceed !== "yes") {
    console.log("Conversion cancelled.");
    return;
  }

  console.log("\n🔄 Starting conversion process...\n");

  let convertedCount = 0;
  let failedCount = 0;

  for (const file of pngFiles) {
    console.log(`\n📸 Processing: ${file.path}`);

    // Check if ImageMagick is available
    try {
      execSync("which magick", { stdio: "pipe" });
    } catch (error: unknown) {
      console.error("Error checking for ImageMagick:", error);
      console.error(
        "❌ ImageMagick 'convert' command not found. Please install ImageMagick first.",
      );
      console.error("   On macOS: brew install imagemagick");
      console.error("   On Ubuntu/Debian: sudo apt-get install imagemagick");
      // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
      process.exit(1);
    }

    // Ask for individual confirmation
    const confirm = await promptUser(`Convert ${file.path} to JPG? (Y/n): `);

    if (confirm === "n" || confirm === "no") {
      console.log(`⏭️  Skipped: ${file.path}`);
      continue;
    }

    const success = convertPngToJpg(file.path, quality);
    if (success) {
      convertedCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`\n📊 Conversion Summary:`);
  console.log(`   ✅ Converted: ${convertedCount}`);
  console.log(`   ❌ Failed: ${failedCount}`);
  console.log(
    `   ⏭️  Skipped: ${pngFiles.length - convertedCount - failedCount}`,
  );

  if (convertedCount > 0) {
    console.log(
      `\n🎉 Successfully converted ${convertedCount} PNG file(s) to JPG format!`,
    );
  }
}

async function promptUser(question: string): Promise<string> {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

// Run the script
await main().catch((error: unknown) => {
  console.error("Error during conversion:", error);
  // eslint-disable-next-line n/no-process-exit, unicorn/no-process-exit
  process.exit(1);
});

/* eslint-enable no-console */
