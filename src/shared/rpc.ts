import type { RPCSchema } from "electrobun";
import type { AgentEvent } from "./event";
import type { UserSettings } from "./settings";

export interface MyWebviewRPCType {
  // functions that execute in the main process
  bun: RPCSchema<{
    requests: {
      selectWd: {
        params: undefined;
        response: string | null;
      };
      getSettings: {
        params: undefined;
        response: UserSettings;
      };
      saveSettings: {
        params: UserSettings;
        response: UserSettings;
      };
      startAgent: {
        params: {
          workflowId: string;
          prompt: string;
        };
        response: {
          workflowId: string;
          accepted: boolean;
        };
      };
      cancelAgent: {
        params: {
          workflowId: string;
        };
        response: {
          cancelled: boolean;
        };
      };
    };
    messages: {
      logToBun: {
        msg: string;
      };
    };
  }>;
  // functions that execute in the browser context
  webview: RPCSchema<{
    requests: {
      someWebviewFunction: {
        params: {
          a: number;
          b: number;
        };
        response: number;
      };
    };
    messages: {
      logToWebview: {
        msg: any;
      };
      agentEvent: AgentEvent;
    };
  }>;
}
