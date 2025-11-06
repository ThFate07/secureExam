"use client";

const FACE_API_VERSION = process.env.NEXT_PUBLIC_FACE_API_VERSION ?? "1.7.15";
const FACE_API_CDN =
  process.env.NEXT_PUBLIC_FACE_API_CDN ??
  `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${FACE_API_VERSION}/dist/face-api.min.js`;
const MODEL_BASE_URI =
  process.env.NEXT_PUBLIC_FACE_API_MODEL_URI ??
  `https://cdn.jsdelivr.net/npm/@vladmandic/face-api@${FACE_API_VERSION}/model`;

type Point = { x: number; y: number };

interface FaceApiNet {
  loadFromUri(uri: string): Promise<void>;
  isLoaded?: boolean;
}

export interface FaceLandmarks {
  getLeftEye(): Point[];
  getRightEye(): Point[];
  getNose(): Point[];
  getJawOutline(): Point[];
}

export interface FaceDetectionWithLandmarks {
  detection: {
    score: number;
    box?: { width: number; height: number; top: number; left: number };
  };
  landmarks: FaceLandmarks;
}

export interface FaceApi {
  nets: {
    tinyFaceDetector: FaceApiNet;
    faceLandmark68Net: FaceApiNet;
  };
  TinyFaceDetectorOptions: new (config?: { inputSize?: number; scoreThreshold?: number }) => unknown;
  detectAllFaces(input: HTMLVideoElement, options?: unknown): {
    withFaceLandmarks(): Promise<FaceDetectionWithLandmarks[]>;
  };
}

declare global {
  interface Window {
    faceapi?: FaceApi;
  }
}

let faceApiPromise: Promise<FaceApi> | null = null;
let modelsPromise: Promise<void> | null = null;
let moduleLoadAttempted = false;
let backendInitPromise: Promise<void> | null = null;

type FaceApiModule = FaceApi & { default?: FaceApi };
type TensorFlowRuntime = {
  ready?: () => Promise<void>;
  getBackend?: () => string;
  setBackend?: (backend: string) => Promise<unknown>;
  findBackendFactory?: (name: string) => unknown;
};

function resetFaceApiPromise() {
  faceApiPromise = null;
}

async function loadFaceApiFromModule(): Promise<FaceApi> {
  const imported = (await import("@vladmandic/face-api")) as unknown as FaceApiModule;
  const faceapi = imported.default ?? imported;

  if (!faceapi || typeof faceapi !== "object") {
    throw new Error("face-api module did not return a valid instance");
  }

  window.faceapi = faceapi as FaceApi;
  return window.faceapi;
}

function loadFaceApiFromScript(): Promise<FaceApi> {
  return new Promise((resolve, reject) => {
    if (window.faceapi) {
      resolve(window.faceapi);
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>("script[data-face-api-loader]");
    const script = existing ?? document.createElement("script");

    const cleanup = () => {
      script.removeEventListener("load", loadHandler);
      script.removeEventListener("error", errorHandler);
    };

    const loadHandler = () => {
      cleanup();
      if (window.faceapi) {
        resolve(window.faceapi);
      } else {
        reject(new Error("face-api script loaded but no global instance found"));
      }
    };

    const errorHandler = (event?: ErrorEvent | Event) => {
      cleanup();
      if (!existing && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      const message = event instanceof ErrorEvent && event.message ? `: ${event.message}` : "";
      reject(new Error(`Failed to load face-api script${message}`));
    };

    if (existing) {
      if (existing.dataset.faceApiLoaded === "true" && window.faceapi) {
        resolve(window.faceapi);
        return;
      }
      script.addEventListener("load", loadHandler, { once: true });
      script.addEventListener("error", errorHandler, { once: true });
      return;
    }

    script.src = FACE_API_CDN;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.referrerPolicy = "no-referrer";
    script.dataset.faceApiLoader = "true";
    script.addEventListener(
      "load",
      () => {
        script.dataset.faceApiLoaded = "true";
        loadHandler();
      },
      { once: true }
    );
    script.addEventListener("error", errorHandler, { once: true });
    document.head.appendChild(script);
  });
}

async function ensureTensorflowBackend(faceapi: FaceApi): Promise<void> {
  const tf = (faceapi as FaceApi & { tf?: TensorFlowRuntime }).tf;
  if (!tf?.ready || !tf.setBackend || !tf.getBackend) {
    return;
  }

  if (!backendInitPromise) {
    backendInitPromise = (async () => {
      const preferred = process.env.NEXT_PUBLIC_FACE_API_BACKEND?.toLowerCase().trim();
      const candidates = Array.from(
        new Set(
          [preferred, "wasm", "cpu"].filter(
            (backend): backend is string => Boolean(backend) && typeof backend === "string"
          )
        )
      );

      await tf.ready();

      for (const backend of candidates) {
        try {
          if (backend === tf.getBackend()) {
            await tf.ready();
            return;
          }

          if (backend === "wasm" && typeof tf.findBackendFactory === "function") {
            const hasWasm = Boolean(tf.findBackendFactory("wasm"));
            if (!hasWasm) {
              await import("@tensorflow/tfjs-backend-wasm");
            }
          }

          await tf.setBackend(backend);
          await tf.ready();
          return;
        } catch (error) {
          console.warn(`[FaceApiLoader] Failed to activate TensorFlow backend '${backend}'`, error);
        }
      }

      // Fall back to existing backend if all attempts failed
      await tf.setBackend(tf.getBackend());
      await tf.ready();
    })().catch((error) => {
      backendInitPromise = null;
      throw error;
    });
  }

  await backendInitPromise;
}

export async function loadFaceApi(): Promise<FaceApi> {
  if (typeof window === "undefined") {
    throw new Error("face-api can only be loaded in the browser");
  }

  if (window.faceapi) {
    return window.faceapi;
  }

  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      if (!moduleLoadAttempted) {
        moduleLoadAttempted = true;
        try {
          return await loadFaceApiFromModule();
        } catch (error) {
          moduleLoadAttempted = false;
          console.warn("[FaceApiLoader] module import failed, falling back to CDN script", error);
        }
      }

      const faceapi = await loadFaceApiFromScript();
      await ensureTensorflowBackend(faceapi);
      return faceapi;
    })().catch((error) => {
      resetFaceApiPromise();
      throw error;
    });
  }

  const faceapi = await faceApiPromise;
  await ensureTensorflowBackend(faceapi);
  return faceapi;
}

export async function ensureFaceApiModels(): Promise<FaceApi> {
  const faceapi = await loadFaceApi();

  if (!modelsPromise) {
    const { tinyFaceDetector, faceLandmark68Net } = faceapi.nets;
    modelsPromise = Promise.all([
      tinyFaceDetector.isLoaded
        ? Promise.resolve()
        : tinyFaceDetector.loadFromUri(MODEL_BASE_URI),
      faceLandmark68Net.isLoaded
        ? Promise.resolve()
        : faceLandmark68Net.loadFromUri(MODEL_BASE_URI),
    ])
      .then(() => undefined)
      .catch((error) => {
        modelsPromise = null;
        throw error;
      });
  }

  await modelsPromise;
  return faceapi;
}

export const FACE_API_MODEL_URI = MODEL_BASE_URI;

export type FaceApiInstance = Awaited<ReturnType<typeof ensureFaceApiModels>>;

export {};
