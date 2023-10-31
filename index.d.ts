declare module 'backend-monitoring' {
    function init(token: string, serviceToken: string): void;
  
    namespace init {
      function alert(name?: string, message?: string): void;
    }
  
    // Export the init function type.
    export = init;
  }