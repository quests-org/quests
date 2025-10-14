import { execa, type Options } from "execa";

export function execaElectronNode<OptionsType extends Options = Options>(
  file: string | URL,
  arguments_?: readonly string[],
  options?: OptionsType,
) {
  return execa(file, arguments_, {
    ...options,
    env: {
      ...options?.env,
      // Required for normal node processes to work
      // See https://www.electronjs.org/docs/latest/api/environment-variables
      ELECTRON_RUN_AS_NODE: "1",
    },
    node: true,
  } as unknown as OptionsType & { env: Record<string, string>; node: true });
}
