import { cleanFilePath } from "../../lib/file-utils";
import { MonoText } from "./mono-text";
import { SectionHeader } from "./section-header";

export function ToolPartFilePath({
  filePath,
  label,
}: {
  filePath: string;
  label: string;
}) {
  return (
    <div>
      <SectionHeader>{label}</SectionHeader>
      <MonoText>{cleanFilePath(filePath)}</MonoText>
    </div>
  );
}
