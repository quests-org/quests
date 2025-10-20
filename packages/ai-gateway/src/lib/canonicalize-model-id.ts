const DATE_PATTERN = /^(.+)-(\d{8})$/;

export function canonicalizeAnthropicModelId(modelId: string): string {
  const match = DATE_PATTERN.exec(modelId);

  if (match?.[1] && match[2]) {
    const baseName = match[1];
    const dateString = match[2];

    if (isValidDateString(dateString)) {
      return baseName;
    }
  }

  return modelId;
}

function isValidDateString(dateString: string): boolean {
  if (dateString.length !== 8) {
    return false;
  }

  const year = Number.parseInt(dateString.slice(0, 4), 10);
  const month = Number.parseInt(dateString.slice(4, 6), 10);
  const day = Number.parseInt(dateString.slice(6, 8), 10);

  if (year < 2020 || year > 2099) {
    return false;
  }

  if (month < 1 || month > 12) {
    return false;
  }

  if (day < 1 || day > 31) {
    return false;
  }

  return true;
}
