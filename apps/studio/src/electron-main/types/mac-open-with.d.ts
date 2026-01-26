declare module "mac-open-with" {
  export interface App {
    icon: string;
    isDefault: boolean;
    url: string;
  }

  export function getAppsThatOpenExtension(extension: string): Promise<App[]>;
  export namespace getAppsThatOpenExtension {
    function sync(extension: string): App[];
  }

  export function getAppsThatOpenFile(filePath: string): Promise<App[]>;
  export namespace getAppsThatOpenFile {
    function sync(filePath: string): App[];
  }

  export function getAppsThatOpenType(fileType: string): Promise<App[]>;
  export namespace getAppsThatOpenType {
    function sync(fileType: string): App[];
  }

  export function open(filePath: string, appUrl: string): boolean;

  const openWith: {
    getAppsThatOpenExtension: typeof getAppsThatOpenExtension;
    getAppsThatOpenFile: typeof getAppsThatOpenFile;
    getAppsThatOpenType: typeof getAppsThatOpenType;
    open: typeof open;
  };

  export default openWith;
}
