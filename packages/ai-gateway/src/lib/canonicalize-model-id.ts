export function canonicalizeAnthropicModelId(modelId: string): string {
  const dateMatch = /^(.+)-(\d{8})$/.exec(modelId);
  if (dateMatch?.[1] && dateMatch[2]) {
    return isValidDate(dateMatch[2])
      ? convertVersionDashes(dateMatch[1])
      : modelId;
  }

  return convertVersionDashes(modelId);
}

function convertVersionDashes(modelId: string): string {
  const parts = modelId.split("-");

  let firstNumberIndex = -1;
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i];
    if (!part || !/^\d+$/.test(part)) {
      break;
    }
    firstNumberIndex = i;
  }

  if (firstNumberIndex === -1 || firstNumberIndex === parts.length - 1) {
    return modelId;
  }

  const baseParts = parts.slice(0, firstNumberIndex);
  const versionParts = parts.slice(firstNumberIndex);

  return baseParts.join("-") + "-" + versionParts.join(".");
}

function isValidDate(dateString: string): boolean {
  const year = Number.parseInt(dateString.slice(0, 4), 10);
  const month = Number.parseInt(dateString.slice(4, 6), 10);
  const day = Number.parseInt(dateString.slice(6, 8), 10);

  return (
    year >= 2020 &&
    year <= 2099 &&
    month >= 1 &&
    month <= 12 &&
    day >= 1 &&
    day <= 31
  );
}
