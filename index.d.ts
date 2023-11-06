declare module "wooffer" {
    // Function signature for the init function (default export)
    const init: {
      (): void;
    };
    export default init;
  
    // Named exports
    export function alert(message: string): void;
    export function success(message: string): void;
    export function fail(message: string): void;
    export function requestMonitoring(req:object, res:object, nex:Function): void;
    
    // Additional properties if needed
    export const someProperty: string;
  }