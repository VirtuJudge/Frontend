import { BaseClient, ClientConfig, ApiClientError, API_ENDPOINTS } from "./clients/base";
import { TeamsClient } from "./clients/teams";
import { ProjectsClient } from "./clients/projects";
import { SessionsClient } from "./clients/sessions";
import { QaClient } from "./clients/qa";

export * from "./types";
export { ApiClientError, API_ENDPOINTS, type ClientConfig };

class ApiClientBase extends BaseClient {
  constructor(config?: ClientConfig) {
    super(config);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyMixins(derivedCtor: any, constructors: any[]) {
  constructors.forEach((baseCtor) => {
    Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
      if (name !== "constructor") {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name) ||
            Object.create(null)
        );
      }
    });
  });
}

applyMixins(ApiClientBase, [TeamsClient, ProjectsClient, SessionsClient, QaClient]);

export const ApiClient = ApiClientBase as unknown as {
  new (config?: ClientConfig): ApiClientBase & TeamsClient & ProjectsClient & SessionsClient & QaClient;
};

export type ApiClient = InstanceType<typeof ApiClient>;

export const apiClient = new ApiClient();
