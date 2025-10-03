import { z } from "zod";

import {
  EvalTemplateGroupSchema,
  getEvalTemplateGroups,
} from "../../lib/eval-templates";
import { base } from "../base";

const listGroups = base.output(z.array(EvalTemplateGroupSchema)).handler(() => {
  return getEvalTemplateGroups();
});

export const evals = {
  template: {
    listGroups,
  },
};
