import { type AIProviderType } from "@quests/shared";
import { atomWithReducer } from "jotai/utils";

import { type OpenAICompatibleProvider } from "../data/openai-compatible-providers";

type AddProviderAction =
  | { message: string; type: "SET_ERROR"; validationFailed: boolean }
  | {
      provider: OpenAICompatibleProvider | undefined;
      type: "SELECT_OPENAI_COMPATIBLE_PROVIDER";
    }
  | { providerType: AIProviderType; type: "SELECT_PROVIDER" }
  | { type: "BACK_TO_SELECTION" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "SET_API_KEY"; value: string }
  | { type: "SET_BASE_URL"; value: string }
  | { type: "SET_CUSTOM_PROVIDER" }
  | { type: "SET_DISPLAY_NAME"; value: string };

interface AddProviderState {
  apiKey: string;
  baseURL: string;
  displayName: string;
  errorMessage: null | string;
  isCustomProvider: boolean;
  selectedOpenAICompatibleProvider: OpenAICompatibleProvider | undefined;
  selectedProviderType: AIProviderType | undefined;
  stage: "configuration" | "provider-selection";
  validationFailed: boolean;
}

const initialState: AddProviderState = {
  apiKey: "",
  baseURL: "",
  displayName: "",
  errorMessage: null,
  isCustomProvider: false,
  selectedOpenAICompatibleProvider: undefined,
  selectedProviderType: undefined,
  stage: "provider-selection",
  validationFailed: false,
};

function addProviderReducer(
  state: AddProviderState,
  action: AddProviderAction,
): AddProviderState {
  switch (action.type) {
    case "BACK_TO_SELECTION": {
      return {
        ...state,
        errorMessage: null,
        isCustomProvider: false,
        selectedOpenAICompatibleProvider: undefined,
        selectedProviderType: undefined,
        stage: "provider-selection",
        validationFailed: false,
      };
    }

    case "CLEAR_ERROR": {
      return {
        ...state,
        errorMessage: null,
        validationFailed: false,
      };
    }

    case "RESET": {
      return initialState;
    }

    case "SELECT_OPENAI_COMPATIBLE_PROVIDER": {
      if (action.provider === undefined) {
        return {
          ...state,
          baseURL: "",
          displayName: "",
          errorMessage: null,
          isCustomProvider: false,
          selectedOpenAICompatibleProvider: undefined,
          validationFailed: false,
        };
      }
      return {
        ...state,
        baseURL: action.provider.api.defaultBaseURL,
        displayName: "",
        errorMessage: null,
        isCustomProvider: false,
        selectedOpenAICompatibleProvider: action.provider,
        validationFailed: false,
      };
    }

    case "SELECT_PROVIDER": {
      return {
        ...state,
        errorMessage: null,
        selectedProviderType: action.providerType,
        stage: "configuration",
        validationFailed: false,
      };
    }

    case "SET_API_KEY": {
      return {
        ...state,
        apiKey: action.value,
        errorMessage: null,
        validationFailed: false,
      };
    }

    case "SET_BASE_URL": {
      return {
        ...state,
        baseURL: action.value,
        errorMessage: null,
        validationFailed: false,
      };
    }

    case "SET_CUSTOM_PROVIDER": {
      return {
        ...state,
        baseURL: "",
        displayName: "",
        errorMessage: null,
        isCustomProvider: true,
        selectedOpenAICompatibleProvider: undefined,
        validationFailed: false,
      };
    }

    case "SET_DISPLAY_NAME": {
      return {
        ...state,
        displayName: action.value,
      };
    }

    case "SET_ERROR": {
      return {
        ...state,
        errorMessage: action.message,
        validationFailed: action.validationFailed,
      };
    }

    default: {
      return state;
    }
  }
}

export const addProviderDialogAtom = atomWithReducer<
  AddProviderState,
  AddProviderAction
>(initialState, addProviderReducer);
