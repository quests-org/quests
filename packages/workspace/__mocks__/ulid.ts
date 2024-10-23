// This is a mock to ensure that the ulid generator is deterministic when
// running tests in any order
import { monotonicFactory as ulidMonotonicFactory } from "ulid";
import { beforeEach } from "vitest";

const ulidGenerator = ulidMonotonicFactory(() => 0.26);

let currentTaskSeedTime = 1;

beforeEach(({ task }) => {
  // Parse the task ID to make a deterministic seed time with low collision
  // Ids look like this:
  // 1223128da3_0_1_2_3...
  // 0, 1, 2, 3 represent each describe / it block
  // File hash changes based on runtime, so we ignore it
  const [_fileHash, ...rest] = task.id.split("_");
  const index = rest.reduce((acc, curr) => acc + Number.parseInt(curr, 10), 0);

  // Set the seed time for this task
  currentTaskSeedTime = index + 1 * 1000;
});

export const ulid = () => {
  return ulidGenerator(currentTaskSeedTime);
};

// eslint-disable-next-line unicorn/consistent-function-scoping
export const monotonicFactory = () => () => ulidGenerator(currentTaskSeedTime);
