import { type AIProviderType } from "@quests/shared";
import { atomWithReducer } from "jotai/utils";

type AddProviderAction =
  | { message: string; type: "SET_ERROR"; validationFailed: boolean }
  | { providerType: AIProviderType; type: "SELECT_PROVIDER" }
  | { type: "CLEAR_ERROR" }
  | { type: "RESET" }
  | { type: "SET_API_KEY"; value: string }
  | { type: "SET_BASE_URL"; value: string }
  | { type: "SET_DISPLAY_NAME"; value: string };

interface AddProviderState {
  apiKey: string;
  baseURL: string;
  displayName: string;
  errorMessage: null | string;
  selectedProviderType: AIProviderType | undefined;
  validationFailed: boolean;
}

const initialState: AddProviderState = {
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
        baseURL: "",
        displayName: "",
        errorMessage: null,
        selectedProviderType: action.providerType,
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
