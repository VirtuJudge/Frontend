export interface StoredSessionAsset {
  id: string;
  assetId?: string;
  versionId?: string;
  name: string;
  size: number;
  type?: string;
}

export interface StoredSessionPresentationVideo {
  videoUrl?: string;
  assetId?: string;
  versionId?: string;
  fileName?: string;
  fileSize?: number;
  link?: string;
  uploadedAt?: string;
}

export interface StoredSessionConfig {
  projectId: string;
  discussionPanel: boolean;
  showTimer: boolean;
  allowPauses: boolean;
  // Times set by user (for frontend logic)
  presentationDuration: number; // total in seconds
  presentationMinutes: number;
  presentationSeconds: number;
  questionsDuration: number; // total in seconds
  questionsMinutes: number;
  questionsSeconds: number;
  // Selected assets from session/prepare
  selectedAssets: StoredSessionAsset[];
  documentAssetIds: string[];
  documentVersionIds: string[];
  // Presentation video details
  presentationVideo?: StoredSessionPresentationVideo;
  // Created session ID after successful API creation
  sessionId?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get the localStorage key for a given projectId
 */
export function getSessionStorageKey(projectId: string): string {
  return projectId;
}

/**
 * Fallback prefixed key
 */
export function getPrefixedStorageKey(projectId: string): string {
  return `session_config_${projectId}`;
}

/**
 * Retrieve session configuration from localStorage for a given projectId
 */
export function getSessionConfig(projectId: string): StoredSessionConfig | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const raw =
      window.localStorage.getItem(getSessionStorageKey(projectId)) ||
      window.localStorage.getItem(getPrefixedStorageKey(projectId));

    if (!raw) return null;
    return JSON.parse(raw) as StoredSessionConfig;
  } catch (err) {
    console.warn("Failed to load session config from localStorage:", err);
    return null;
  }
}

/**
 * Save or update session configuration in localStorage for a given projectId
 * Stores both under `projectId` and `session_config_${projectId}` for complete compatibility.
 */
export function saveSessionConfig(
  projectId: string,
  updates: Partial<StoredSessionConfig>,
): StoredSessionConfig {
  const existing = getSessionConfig(projectId);
  const now = new Date().toISOString();

  const merged: StoredSessionConfig = {
    projectId,
    discussionPanel: updates.discussionPanel ?? existing?.discussionPanel ?? true,
    showTimer: updates.showTimer ?? existing?.showTimer ?? true,
    allowPauses: updates.allowPauses ?? existing?.allowPauses ?? true,
    presentationDuration:
      updates.presentationDuration ?? existing?.presentationDuration ?? 390,
    presentationMinutes:
      updates.presentationMinutes ??
      existing?.presentationMinutes ??
      Math.floor((updates.presentationDuration ?? existing?.presentationDuration ?? 390) / 60),
    presentationSeconds:
      updates.presentationSeconds ??
      existing?.presentationSeconds ??
      ((updates.presentationDuration ?? existing?.presentationDuration ?? 390) % 60),
    questionsDuration:
      updates.questionsDuration ?? existing?.questionsDuration ?? 300,
    questionsMinutes:
      updates.questionsMinutes ??
      existing?.questionsMinutes ??
      Math.floor((updates.questionsDuration ?? existing?.questionsDuration ?? 300) / 60),
    questionsSeconds:
      updates.questionsSeconds ??
      existing?.questionsSeconds ??
      ((updates.questionsDuration ?? existing?.questionsDuration ?? 300) % 60),
    selectedAssets: updates.selectedAssets ?? existing?.selectedAssets ?? [],
    documentAssetIds:
      updates.documentAssetIds ??
      existing?.documentAssetIds ??
      (updates.selectedAssets
        ? updates.selectedAssets.map((a) => a.assetId || a.id).filter(Boolean)
        : []),
    documentVersionIds:
      updates.documentVersionIds ??
      existing?.documentVersionIds ??
      (updates.selectedAssets
        ? updates.selectedAssets.map((a) => a.versionId).filter((v): v is string => !!v)
        : []),
    presentationVideo: updates.presentationVideo ?? existing?.presentationVideo,
    sessionId: updates.sessionId ?? existing?.sessionId,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  if (typeof window !== "undefined" && window.localStorage) {
    try {
      const serialized = JSON.stringify(merged);
      window.localStorage.setItem(getSessionStorageKey(projectId), serialized);
      window.localStorage.setItem(getPrefixedStorageKey(projectId), serialized);
      if (merged.sessionId) {
        window.localStorage.setItem(`session_by_id_${merged.sessionId}`, serialized);
      }
    } catch (err) {
      console.warn("Failed to save session config to localStorage:", err);
    }
  }

  return merged;
}

/**
 * Retrieve session configuration from localStorage by sessionId
 */
export function getSessionConfigBySessionId(sessionId: string): StoredSessionConfig | null {
  if (typeof window === "undefined" || !window.localStorage) {
    return null;
  }

  try {
    const direct = window.localStorage.getItem(`session_by_id_${sessionId}`);
    if (direct) {
      return JSON.parse(direct) as StoredSessionConfig;
    }

    // Search through localStorage keys
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      const raw = window.localStorage.getItem(key);
      if (!raw || !raw.startsWith("{")) continue;
      try {
        const parsed = JSON.parse(raw) as StoredSessionConfig;
        if (parsed && parsed.sessionId === sessionId) {
          return parsed;
        }
      } catch {
        // Not a JSON object, ignore
      }
    }
  } catch (err) {
    console.warn("Failed to lookup session config by sessionId:", err);
  }

  return null;
}

/**
 * Save presentation video details into the session configuration
 */
export function savePresentationVideo(
  projectId: string,
  video: StoredSessionPresentationVideo,
): StoredSessionConfig {
  const existing = getSessionConfig(projectId);
  const updatedVideo: StoredSessionPresentationVideo = {
    ...existing?.presentationVideo,
    ...video,
    uploadedAt: video.uploadedAt || new Date().toISOString(),
  };

  return saveSessionConfig(projectId, {
    presentationVideo: updatedVideo,
  });
}

/**
 * Clear session configuration from localStorage
 */
export function clearSessionConfig(projectId: string): void {
  if (typeof window !== "undefined" && window.localStorage) {
    try {
      window.localStorage.removeItem(getSessionStorageKey(projectId));
      window.localStorage.removeItem(getPrefixedStorageKey(projectId));
    } catch (err) {
      console.warn("Failed to clear session config from localStorage:", err);
    }
  }
}
