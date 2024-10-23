import { type AIGatewayModel } from "@quests/ai-gateway";
import { atomWithStorage } from "jotai/utils";

export const selectedModelURIAtom = atomWithStorage<
  AIGatewayModel.URI | undefined
>("selectedModelURI", undefined);
