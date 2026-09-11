import apiClient, { withJsonContentType } from "./apiClient";
import { readStorage, writeStorage } from "../services/storageService";

interface LocalAgentSignup {
  id: string;
  submittedAt: string;
  payload: unknown;
}

const localSignupStorageKey = "trust-fund-agent-signups";
const waitForLocalSignup = () => new Promise((resolve) => window.setTimeout(resolve, 450));

export const agentApi = {
  async signup(formData: FormData) {
    if (!import.meta.env.VITE_API_URL) {
      return createLocalAgentSignup(formData);
    }

    const response = await apiClient.post("/agent/signup", formData);
    return response.data;
  },

  async getProfile() {
    const response = await apiClient.get("/agent/profile");
    return response.data;
  },

  async updateProfile(data: unknown) {
    const response = await apiClient.put("/agent/profile", data, withJsonContentType(data));
    return response.data;
  },

  async uploadProfilePhoto(formData: FormData) {
    const response = await apiClient.post("/agent/profile/photo", formData);
    return response.data;
  }
};

async function createLocalAgentSignup(formData: FormData) {
  await waitForLocalSignup();
  const payload = await getSignupPayload(formData);
  const submissions = readStorage<LocalAgentSignup[]>(localSignupStorageKey, []);
  const submission = {
    id: `AS-${String(submissions.length + 1).padStart(5, "0")}`,
    submittedAt: new Date().toISOString(),
    payload
  };

  writeStorage(localSignupStorageKey, [submission, ...submissions]);
  return submission;
}

async function getSignupPayload(formData: FormData) {
  const payload = formData.get("payload");
  if (payload instanceof Blob) {
    return JSON.parse(await payload.text());
  }
  if (typeof payload === "string") {
    return JSON.parse(payload);
  }
  return {};
}
