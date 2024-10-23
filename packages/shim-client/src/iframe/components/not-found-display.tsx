import { FileX } from "lucide-react";

interface NotFoundDisplayProps {
  status: string;
}

export function NotFoundDisplay({ status }: NotFoundDisplayProps) {
  const isNotRunnable = status === "not-runnable";

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50">
      <div className="relative max-w-2xl rounded-lg bg-white p-8 shadow-lg">
        <div className="mb-4 flex items-center">
          <FileX className="mr-3 h-6 w-6 text-gray-500" />
          <h2 className="text-xl font-semibold text-gray-800">
            {isNotRunnable ? "App Not Runnable" : "App Not Found"}
          </h2>
        </div>
        <p className="mb-6 text-gray-600">
          {isNotRunnable
            ? "This app cannot be run because it has no package.json file."
            : "The requested app was not found. This is not a valid app URL."}
        </p>

        <div className="mb-4 mt-2 overflow-auto rounded-md bg-gray-100 px-4 py-3 font-mono text-sm">
          <span className="text-gray-500">
            {/* eslint-disable-next-line react/jsx-no-comment-textnodes */}
            {window.location.protocol}//
          </span>
          <span className="text-orange-500">
            {window.location.hostname.split(".")[0]}
          </span>
          <span className="text-gray-500">
            .{window.location.hostname.split(".").slice(1).join(".")}:
            {window.location.port}
          </span>
        </div>

        <div className="text-sm text-gray-500">
          {isNotRunnable
            ? "Please ensure the app has a valid package.json file."
            : "This domain does not correspond to any existing app. Please check the URL and try again."}
        </div>
      </div>
    </div>
  );
}
