import { type AIProviderType } from "@quests/shared";
import { atomWithReducer } from "jotai/utils";

type AddProviderAction =
  | {
      allowBypass: boolean;
      message: string;
      type: "SET_ERROR";
      validationFailed: boolean;
    }
  | {
      displayName?: string;
      providerType: AIProviderType;
      type: "SELECT_PROVIDER";
    }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "SET_API_KEY"; value: string }
  | { type: "SET_BASE_URL"; value: string }
  | { type: "SET_DISPLAY_NAME"; value: string };

interface AddProviderState {
  allowBypass: boolean;
  apiKey: string;
  baseURL: string;
  displayName: string;
  errorMessage: null | string;
  selectedProviderType: AIProviderType | undefined;
  validationFailed: boolean;
}

const initialState: AddProviderState = {
  allowBypass: false,
  apiKey: "",
  baseURL: "",
  displayName: "",
  errorMessage: null,
  selectedProviderType: undefined,
  validationFailed: false,
};

function addProviderReducer(
  state: AddProviderState,
  action: AddProviderAction,
): AddProviderState {
  switch (action.type) {
    case "CLEAR_ERROR": {
      return {
        ...state,
        allowBypass: false,
        errorMessage: null,
        validationFailed: false,
      };
    }

    case "RESET": {
      return initialState;
    }

    case "SELECT_PROVIDER": {
      return {
        ...state,
        allowBypass: false,
        baseURL: "",
        displayName: action.displayName ?? "",
        errorMessage: null,
        selectedProviderType: action.providerType,
        validationFailed: false,
      };
    }

    case "SET_API_KEY": {
      return {
        ...state,
        allowBypass: false,
        apiKey: action.value,
        errorMessage: null,
        validationFailed: false,
      };
    }

    case "SET_BASE_URL": {
      return {
        ...state,
        allowBypass: false,
        baseURL: action.value,
        errorMessage: null,
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
        allowBypass: action.allowBypass,
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
