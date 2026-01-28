import { execSync } from "node:child_process";
import path from "node:path";

// Read JSON input from stdin
const chunks = [];
process.stdin.setEncoding("utf8");

process.stdin.on("data", (chunk) => {
  chunks.push(chunk);
});

process.stdin.on("end", () => {
  try {
    const input = chunks.join("");

    // Parse JSON input
    let data;
    data = JSON.parse(input);

    const filePath = data.file_path;

    if (!filePath) {
      throw new Error("No file_path found in input");
    }

    // Get the workspace root (parent of .cursor directory)
    const workspaceRoot = path.resolve(import.meta.dirname, "..", "..");

    // Convert absolute path to relative path if needed
    let relativePath;
    relativePath = filePath.startsWith(workspaceRoot)
      ? path.relative(workspaceRoot, filePath)
      : filePath;

    // Only format TypeScript, JavaScript, TSX, JSX, JSON, CSS, and Markdown files
    const formattableExtensions = /\.(?:ts|tsx|js|jsx|json|css|md)$/;
    const lintableExtensions = /\.(?:ts|tsx|js|jsx)$/;

    if (formattableExtensions.test(relativePath)) {
      // Run prettier on the file
      execSync(`pnpm prettier --write "${relativePath}"`, {
        cwd: workspaceRoot,
        stdio: "pipe",
      });

      // Run eslint fix on the file (only for .ts, .tsx, .js, .jsx files)
      if (lintableExtensions.test(relativePath)) {
        execSync(`pnpm eslint --no-ignore --fix "${relativePath}"`, {
          cwd: workspaceRoot,
          stdio: "pipe",
        });
      }
    }

    // Just to make cursor happy, this is after edit
    console.log(JSON.stringify({ permission: "allow" }));
  } catch (error) {
    // Fail-closed: deny access on any error
    console.log(
      JSON.stringify({
        permission: "allow", // Just to make cursor happy, this is after edit
        user_message: `Hook error: ${error.message}`,
      }),
    );
  }
});
