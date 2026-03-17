import { CHECK_EVALS } from "./check";
import { PDF_SKILL_EVALS } from "./pdf-skill";
import { RETRIEVAL_EVALS } from "./retrieval";
import { WEB_SEARCH_EVALS } from "./web-search";

export const EVALS = [
  ...CHECK_EVALS,
  ...PDF_SKILL_EVALS,
  ...RETRIEVAL_EVALS,
  ...WEB_SEARCH_EVALS,
];
