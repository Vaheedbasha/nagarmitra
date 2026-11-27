const TOKEN_KEY = "nagarmitra.token";

/**
 * In development Vite proxies /api to the Express server. In production the API
 * can live on another origin by setting VITE_API_URL at build time.
 */
export const API_BASE = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "";

export function getToken(): string | null {
  try {
    return window.localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) window.localStorage.setItem(TOKEN_KEY, token);
    else window.localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* storage may be blocked in private mode */
  }
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public payload: Record<string, unknown> = {}
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  form?: FormData;
  signal?: AbortSignal;
  anonymous?: boolean;
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token && !options.anonymous) headers.authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["content-type"] = "application/json";

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method: options.method ?? "GET",
      headers,
      body: options.form ?? (options.body !== undefined ? JSON.stringify(options.body) : undefined),
      signal: options.signal,
    });
  } catch {
    throw new ApiError("Cannot reach the NagarMitra server. Check your connection and try again.", 0);
  }

  const text = await response.text();
  let payload: Record<string, unknown> = {};
  if (text) {
    try {
      payload = JSON.parse(text) as Record<string, unknown>;
    } catch {
      payload = { raw: text };
    }
  }

  if (!response.ok) {
    const message =
      typeof payload.error === "string" ? payload.error : `Request failed (${response.status})`;
    throw new ApiError(message, response.status, payload);
  }
  return payload as T;
}

export interface UploadResult {
  id: string;
  kind: "photo" | "video";
  url: string;
  size: number;
}

export async function uploadMedia(file: File, onProgress?: (percent: number) => void): Promise<UploadResult> {
  const form = new FormData();
  form.append("file", file);

  // fetch() has no upload progress events, so use XHR for real progress feedback.
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", `${API_BASE}/api/complaints/media`);
    const token = getToken();
    if (token) request.setRequestHeader("authorization", `Bearer ${token}`);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onerror = () => reject(new ApiError("Upload failed. Check your connection.", 0));
    request.onload = () => {
      let payload: Record<string, any> = {};
      try {
        payload = JSON.parse(request.responseText || "{}");
      } catch {
        payload = {};
      }
      if (request.status >= 200 && request.status < 300) {
        onProgress?.(100);
        resolve(payload as UploadResult);
      } else {
        reject(new ApiError(payload.error ?? "Upload failed.", request.status, payload));
      }
    };
    request.send(form);
  });
}
