import path from "node:path";
import { z } from "zod";

const UnbrandedAbsolutePathSchema = z.string().refine((val) => {
  return path.isAbsolute(val);
}, "Path is not absolute");

export const AbsolutePathSchema =
  UnbrandedAbsolutePathSchema.brand("AbsolutePath");
export type AbsolutePath = z.output<typeof AbsolutePathSchema>;

export const WorkspaceDirSchema = AbsolutePathSchema.brand("WorkspaceDir");
export type WorkspaceDir = z.output<typeof WorkspaceDirSchema>;

export const AppDirSchema = AbsolutePathSchema.brand("AppDir");
export type AppDir = z.output<typeof AppDirSchema>;

const UnbrandedRelativePathSchema = z.string().refine((val) => {
  return !path.isAbsolute(val);
}, "Path is not relative");

export const RelativePathSchema =
  UnbrandedRelativePathSchema.brand("RelativePath");

export type RelativePath = z.output<typeof RelativePathSchema>;
