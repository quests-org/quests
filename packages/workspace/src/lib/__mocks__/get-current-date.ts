import { beforeEach } from "vitest";

// Track the current time with predictable increments
let currentTime: Date;

export function getCurrentDate() {
  const time = currentTime;
  // Increment by 1 second for each call to ensure unique timestamps
  currentTime = new Date(currentTime.getTime() + 1000);
  return time;
}

// Reset time for each test
export function resetMockTime(
  initialTime = new Date("2013-08-31T12:00:00.000Z"),
) {
  currentTime = initialTime;
}

// Auto-reset before each test
beforeEach(() => {
  resetMockTime();
});
