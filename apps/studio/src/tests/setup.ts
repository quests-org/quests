import { config } from "dotenv";
import { vi } from "vitest";
config({ path: ".env.test" });

vi.mock("electron");
