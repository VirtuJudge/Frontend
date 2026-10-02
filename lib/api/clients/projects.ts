import type { Project, Asset, AssetVersion, UploadIntent, DownloadIntent, AssetFilterParams, CreateUploadIntentRequest, CreateVersionUploadIntentRequest, CompleteUploadRequest, Page } from "../types";
import { BaseClient, API_ENDPOINTS } from "./base";
import { generateIdempotencyKey } from "@/lib/upload/idempotency";

export class ProjectsClient extends BaseClient {

  public async getProjects(
    teamId: string,
    cursor?: string,
  ): Promise<Page<Project>> {
    const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
    return this.request<Page<Project>>(
      `${API_ENDPOINTS.teamProjects(teamId)}${query}`,
    );
  }

  public async createProject(
    teamId: string,
    data: { name: string; description?: string },
    idempotencyKey?: string,
  ): Promise<Project> {
    return this.request<Project>(API_ENDPOINTS.teamProjects(teamId), {
      method: "POST",
      body: JSON.stringify(data),
      idempotencyKey,
    });
  }

  public async getProject(projectId: string): Promise<Project> {
    return this.request<Project>(API_ENDPOINTS.project(projectId));
  }

  public async deleteProject(
    projectId: string,
    confirmation?: string,
  ): Promise<void> {
    return this.request<void>(API_ENDPOINTS.project(projectId), {
      method: "DELETE",
      ...(confirmation
        ? {
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ confirmation }),
          }
        : {}),
    });
  }

  public async getAssets(
    projectId: string,
    filters?: AssetFilterParams,
  ): Promise<Page<Asset>> {
    const params = new URLSearchParams();
    if (filters?.kind) params.set("kind", filters.kind);
    if (filters?.state) params.set("state", filters.state);
    if (filters?.cursor) params.set("cursor", filters.cursor);
    if (filters?.limit) params.set("limit", String(filters.limit));
    const query = params.toString() ? `?${params.toString()}` : "";
    const page = await this.request<Page<Asset>>(
      `${API_ENDPOINTS.projectAssets(projectId)}${query}`,
    );
    const itemsWithVersions = await Promise.all(
      page.items.map(async (asset) => {
        if (asset.versions && asset.versions.length > 0) {
          return asset;
        }
        try {
          const vPage = await this.getAssetVersions(asset.id);
          return {
            ...asset,
            versions: vPage.items,
          };
        } catch {
          return asset;
        }
      }),
    );
    return {
      ...page,
      items: itemsWithVersions,
    };
  }

  public async getAssetVersions(
    assetId: string,
  ): Promise<Page<AssetVersion>> {
    return this.request<Page<AssetVersion>>(
      API_ENDPOINTS.assetVersions(assetId),
    );
  }

  public async getAsset(assetId: string): Promise<Asset> {
    return this.request<Asset>(API_ENDPOINTS.asset(assetId));
  }

  public async deleteAsset(assetId: string): Promise<void> {
    return this.request<void>(API_ENDPOINTS.asset(assetId), {
      method: "DELETE",
    });
  }

  public async createUploadIntent(
    projectId: string,
    req: CreateUploadIntentRequest,
    idempotencyKey: string,
  ): Promise<UploadIntent> {
    const raw = await this.request<
      UploadIntent & { asset_version_id?: string }
    >(API_ENDPOINTS.uploadIntents(projectId), {
      method: "POST",
      body: JSON.stringify(req),
      idempotencyKey,
    });
    return {
      ...raw,
      version_id: raw.version_id || raw.asset_version_id || "",
    };
  }

  public async createVersionUploadIntent(
    assetId: string,
    req: CreateVersionUploadIntentRequest,
    idempotencyKey: string,
  ): Promise<UploadIntent> {
    const raw = await this.request<
      UploadIntent & { asset_version_id?: string }
    >(API_ENDPOINTS.versionUploadIntents(assetId), {
      method: "POST",
      body: JSON.stringify(req),
      idempotencyKey,
    });
    return {
      ...raw,
      version_id: raw.version_id || raw.asset_version_id || "",
    };
  }

  public async completeUpload(
    assetId: string,
    versionId: string,
    req: CompleteUploadRequest,
    idempotencyKey?: string,
  ): Promise<Asset> {
    const key = idempotencyKey || generateIdempotencyKey("complete");
    const retryDelaysMs = [1000, 2500];

    for (let attempt = 0; ; attempt += 1) {
      try {
        return await this.request<Asset>(
          API_ENDPOINTS.completeUpload(assetId, versionId),
          {
            method: "POST",
            body: JSON.stringify(req),
            idempotencyKey: key,
          },
        );
      } catch (error) {
        const retryDelay = retryDelaysMs[attempt];
        if (!(error instanceof TypeError) || retryDelay === undefined) {
          throw error;
        }

        // Completion is idempotent. A browser may lose the response while the
        // backend is verifying media, so retry the exact command with the same
        // key instead of forcing the user to create and upload another asset.
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  public async createDownloadIntent(
    assetId: string,
    versionId?: string,
  ): Promise<DownloadIntent> {
    const endpoint = versionId
      ? API_ENDPOINTS.versionDownloadIntents(assetId, versionId)
      : API_ENDPOINTS.downloadIntents(assetId);
    return this.request<DownloadIntent>(endpoint, {
      method: "POST",
    });
  }

  }
