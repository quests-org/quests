import { Button } from "@/client/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/client/components/ui/card";
import { Input } from "@/client/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import { rpcClient } from "@/client/rpc/client";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

export const Route = createFileRoute("/_app/debug/file-associations")({
  component: RouteComponent,
});

const DEFAULT_EXTENSIONS = [
  "txt",
  "pdf",
  "png",
  "jpg",
  "mp4",
  "zip",
  "json",
  "js",
  "ts",
  "tsx",
  "md",
  "html",
  "css",
];

function RouteComponent() {
  const [extensionsInput, setExtensionsInput] = useState(
    DEFAULT_EXTENSIONS.join(", "),
  );
  const [systemAppPath, setSystemAppPath] = useState(
    "/System/Library/CoreServices/Finder.app",
  );

  const mutation = useMutation(
    rpcClient.debug.getFileAssociations.mutationOptions(),
  );

  const systemAppMutation = useMutation(
    rpcClient.debug.getSystemAppIcon.mutationOptions(),
  );

  const handleCheck = () => {
    const extensions = extensionsInput
      .split(",")
      .map((ext) => ext.trim())
      .filter(Boolean);

    mutation.mutate({ extensions });
  };

  const handleGetSystemAppIcon = () => {
    systemAppMutation.mutate({ appPath: systemAppPath });
  };

  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="w-full space-y-8 p-8">
        <Card>
          <CardHeader>
            <CardTitle>File Associations (macOS)</CardTitle>
            <CardDescription>
              View default applications and icons for file extensions on macOS.
              This uses macOS Launch Services APIs to query file type
              associations.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                onChange={(e) => {
                  setExtensionsInput(e.target.value);
                }}
                placeholder="Enter file extensions (comma-separated)"
                value={extensionsInput}
              />
              <Button disabled={mutation.isPending} onClick={handleCheck}>
                {mutation.isPending ? "Checking..." : "Check"}
              </Button>
            </div>

            {mutation.isError && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                Error: {mutation.error.message}
              </div>
            )}

            {mutation.data && mutation.data.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Extension</TableHead>
                    <TableHead>Icon</TableHead>
                    <TableHead>Application</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mutation.data.map((item) => (
                    <TableRow key={item.extension}>
                      <TableCell className="font-mono">
                        .{item.extension}
                      </TableCell>
                      <TableCell>
                        {item.appIcon ? (
                          <img
                            alt={`${item.appName ?? "App"} icon`}
                            className="size-8"
                            src={item.appIcon}
                          />
                        ) : (
                          <div className="size-8 rounded bg-muted" />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.appName || (
                          <span className="text-muted-foreground">
                            No default app
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System App Icon</CardTitle>
            <CardDescription>
              Get icon for any app by providing its full path.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                onChange={(e) => {
                  setSystemAppPath(e.target.value);
                }}
                placeholder="Enter app path (e.g., /System/Library/CoreServices/Finder.app)"
                value={systemAppPath}
              />
              <Button
                disabled={systemAppMutation.isPending}
                onClick={handleGetSystemAppIcon}
              >
                {systemAppMutation.isPending ? "Loading..." : "Get Icon"}
              </Button>
            </div>

            {systemAppMutation.isError && (
              <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
                Error: {systemAppMutation.error.message}
              </div>
            )}

            {systemAppMutation.data && (
              <div className="flex items-center gap-4">
                <img
                  alt="App icon"
                  className="size-16"
                  src={systemAppMutation.data}
                />
                <div className="text-sm text-muted-foreground">
                  Icon retrieved successfully
                </div>
              </div>
            )}

            {systemAppMutation.data === null && (
              <div className="text-sm text-muted-foreground">
                Could not retrieve icon for this path
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
