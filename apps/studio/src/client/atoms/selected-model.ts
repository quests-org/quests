import { type AIGatewayModelURI } from "@quests/ai-gateway/client";
import { atomWithStorage } from "jotai/utils";

export const selectedModelURIAtom = atomWithStorage<
  AIGatewayModelURI.Type | undefined
>("selectedModelURI", undefined);
