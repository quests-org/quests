import { Button } from "@/client/components/ui/button";
import { vanillaRpcClient } from "@/client/rpc/client";
import { createFileRoute } from "@tanstack/react-router";
import {
  type IBuffer,
  type IDecoration,
  type ITerminalAddon,
  Terminal,
} from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

class RowButtonAddon implements ITerminalAddon {
  private _decorations = new Map<number, IDecoration>();
  private _terminal: Terminal | undefined;

  activate(terminal: Terminal): void {
    this._terminal = terminal;

    // Listen for new lines and add decorations
    terminal.onLineFeed(() => {
      this._addDecorationToCurrentLine();
    });
  }

  dispose(): void {
    for (const decoration of this._decorations.values()) {
      decoration.dispose();
    }
    this._decorations.clear();
  }

  private _addDecorationToCurrentLine(): void {
    if (!this._terminal) {
      return;
    }

    const buffer = this._terminal.buffer.active;
    const currentLine = buffer.cursorY + buffer.baseY;

    // Get the content of the line that just finished
    const lineContent = this._getLineContent(buffer, buffer.cursorY - 1);

    // Create a marker for the current line - use offset -1 to position on the line that just finished
    const marker = this._terminal.registerMarker(-1);

    // Create decoration without width to let it position naturally
    const decoration = this._terminal.registerDecoration({
      marker,
    });

    if (!decoration) {
      return;
    }

    // Store decoration
    this._decorations.set(marker.id, decoration);

    // Add button when decoration renders
    decoration.onRender((element) => {
      if (element.classList.contains("demo-row-button")) {
        return;
      } // Already styled as button

      element.style.width = "auto";
      element.style.height = "auto";

      // Analyze line content to determine button style and text
      const lineType = this._analyzeLineContent(lineContent);

      element.className = "demo-row-button";
      element.textContent = lineType.text;

      // Style the decoration element based on line content type
      element.className = `demo-row-button absolute -left-9 top-0 ${lineType.className} rounded-sm text-xs cursor-pointer`;

      element.addEventListener("click", (e) => {
        e.stopPropagation();
        const displayContent = lineContent.trim() || "[empty line]";
        const toastType = lineType.isError
          ? "error"
          : lineType.isExit
            ? "warning"
            : "success";

        if (toastType === "error") {
          toast.error(
            `Line ${currentLine}: ${displayContent.length > 50 ? displayContent.slice(0, 50) + "..." : displayContent}`,
          );
        } else if (toastType === "warning") {
          toast.warning(
            `Line ${currentLine}: ${displayContent.length > 50 ? displayContent.slice(0, 50) + "..." : displayContent}`,
          );
        } else {
          toast.success(
            `Line ${currentLine}: ${displayContent.length > 50 ? displayContent.slice(0, 50) + "..." : displayContent}`,
          );
        }
      });
    });

    // Clean up when decoration is disposed
    decoration.onDispose(() => {
      this._decorations.delete(marker.id);
    });
  }

  private _analyzeLineContent(content: string): {
    className: string;
    isError: boolean;
    isExit: boolean;
    text: string;
  } {
    // Error patterns - check for various error indicators
    const errorPatterns = [
      /\berror\b/i,
      /\bfailed\b/i,
      /\bfailure\b/i,
      /\bexception\b/i,
      /\bcrash\b/i,
      /\bpanic\b/i,
      /\bfatal\b/i,
      /\bcannot\b/i,
      /\bunable\s+to\b/i,
      /\bnot\s+found\b/i,
      /\bpermission\s+denied\b/i,
      /\baccess\s+denied\b/i,
      /\bno\s+such\s+file\b/i,
      /\bcommand\s+not\s+found\b/i,
      /\bsegmentation\s+fault\b/i,
      /\bstack\s+trace\b/i,
      /\btraceback\b/i,
      /^.*:\s*error/i,
    ];

    // Exit patterns - check for process exits with codes
    const exitPatterns = [
      /\bexit\s+(?:code\s+)?(\d+)\b/i,
      /\bprocess\s+(?:exited|terminated)\s+(?:with\s+(?:code\s+)?)?(\d+)\b/i,
      /\breturned\s+(?:exit\s+code\s+)?(\d+)\b/i,
      /\bcommand\s+(?:exited|failed)\s+(?:with\s+(?:code\s+)?)?(\d+)\b/i,
      /\bterminated\s+(?:with\s+(?:code\s+)?)?(\d+)\b/i,
    ];

    // Check for errors first
    for (const pattern of errorPatterns) {
      if (pattern.test(content)) {
        return {
          className: "bg-destructive text-destructive-foreground",
          isError: true,
          isExit: false,
          text: "ERR",
        };
      }
    }

    // Check for process exits
    for (const pattern of exitPatterns) {
      const match = pattern.exec(content);
      if (match) {
        const exitCode = match[1] ? Number.parseInt(match[1], 10) : null;
        const isZeroExit = exitCode === null || exitCode === 0;

        return {
          className: isZeroExit
            ? "bg-green-500 text-green-50 dark:bg-green-600 dark:text-green-100"
            : "bg-yellow-500 text-yellow-50 dark:bg-yellow-600 dark:text-yellow-100",
          isError: false,
          isExit: true,
          text: exitCode === null ? "EXIT" : `EX${exitCode}`,
        };
      }
    }

    // Default for normal lines
    return {
      className: "bg-primary text-primary-foreground",
      isError: false,
      isExit: false,
      text: "INFO",
    };
  }

  private _getLineContent(buffer: IBuffer, lineIndex: number): string {
    try {
      if (lineIndex < 0 || lineIndex >= buffer.length) {
        return "";
      }
      const line = buffer.getLine(lineIndex);
      return line ? line.translateToString().trim() : "";
    } catch {
      return "";
    }
  }
}

export const Route = createFileRoute("/_app/debug/pty")({
  component: RouteComponent,
});

function RouteComponent() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [terminal, setTerminal] = useState<null | Terminal>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!terminalRef.current) {
      return;
    }

    const term = new Terminal({
      allowProposedApi: true,
      cols: 80,
      cursorBlink: true,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      fontSize: 14,
      rows: 30,
      theme: {
        background: "hsl(var(--background))",
        cursor: "hsl(var(--primary))",
        foreground: "hsl(var(--foreground))",
      },
    });

    term.open(terminalRef.current);

    // Load the button addon
    const buttonAddon = new RowButtonAddon();
    term.loadAddon(buttonAddon);

    setTerminal(term);

    return () => {
      buttonAddon.dispose();
      term.dispose();
    };
  }, []);

  const connectTerminal = useCallback(async () => {
    if (!terminal) {
      return;
    }

    try {
      setIsConnected(true);

      terminal.onData((data) => {
        vanillaRpcClient.debug.writeToPty({ data }).catch(() => {
          // Ignore write errors
        });
      });

      // Subscribe to PTY data
      const subscription = await vanillaRpcClient.debug.onPtyData();
      for await (const data of subscription) {
        terminal.write(data);
      }

      terminal.write("Terminal connected! Type commands below:\r\n");
    } catch (error) {
      terminal.write(`Failed to connect terminal: ${String(error)}\r\n`);
      setIsConnected(false);
    }
  }, [terminal]);

  const disconnectTerminal = () => {
    setIsConnected(false);
    terminal?.write("\r\nTerminal disconnected.\r\n");
  };

  const clearTerminal = () => {
    terminal?.clear();
  };

  // Auto-connect when terminal is ready
  useEffect(() => {
    if (terminal && !isConnected) {
      void connectTerminal();
    }
  }, [terminal, isConnected, connectTerminal]);

  // Send return characters on reload/update in dev environment
  useEffect(() => {
    if (terminal && isConnected && import.meta.env.DEV) {
      // Add a small delay to ensure terminal is fully connected
      const timer = setTimeout(() => {
        terminal.write("\r");
      }, 100);

      return () => {
        clearTimeout(timer);
      };
    }
    return;
  }, [terminal, isConnected]);

  return (
    <div className="flex flex-col h-full p-4 gap-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={isConnected ? disconnectTerminal : connectTerminal}
          size="sm"
          variant={isConnected ? "destructive" : "default"}
        >
          {isConnected ? "Disconnect" : "Connect Terminal"}
        </Button>
        <Button onClick={clearTerminal} size="sm" variant="outline">
          Clear
        </Button>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          Status:
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              isConnected
                ? "bg-green-500/20 text-green-700 dark:text-green-300"
                : "bg-gray-500/20 text-gray-700 dark:text-gray-300"
            }`}
          >
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>
      <div className="flex-1 bg-background border rounded-lg overflow-hidden">
        <div
          className="w-full h-full p-2 ml-8"
          ref={terminalRef}
          style={{ minHeight: "400px" }}
        />
      </div>
      <div className="text-xs text-muted-foreground">
        <p>
          This is a debug terminal using node-pty and xterm.js. Click
          &quot;Connect Terminal&quot; to start a shell session.
        </p>
      </div>
    </div>
  );
}
