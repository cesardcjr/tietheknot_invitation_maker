import axios from "axios";

export const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
export const PUBLIC_URL = (import.meta.env.VITE_PUBLIC_URL || window.location.origin).replace(/\/$/, "");
export const PLANNER_URL = import.meta.env.VITE_PLANNER_URL || (import.meta.env.PROD ? "https://tietheknot-mern-front-end.vercel.app" : "http://localhost:5173");

const client = axios.create({ baseURL: API_URL, timeout: 20000 });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("tietheknot_invitation_auth");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const auth = {
  exchange: (code, verifier) => client.post("/auth/studio-handoff/exchange", { code, verifier }),
  login: (credentials) => client.post("/auth/login", credentials),
};

export const invitations = {
  responses: (page) => client.get("/invitations/rsvp/responses", { params: { page } }),
  checkResponse: (id, checked) => client.patch("/invitations/rsvp/responses/" + id, { checked }),
  updateGuestResponse: (id, response) => client.patch("/invitations/rsvp/guests/" + id, { response }),
  bootstrap: () => client.get("/invitations/bootstrap"),
  create: (guestId, customMessage = "") => client.post("/invitations", { guestId, customMessage }),
  update: (id, updates) => client.patch(`/invitations/${id}`, updates),
  regenerate: (id) => client.post(`/invitations/${id}/regenerate-link`),
  revoke: (id) => client.delete(`/invitations/${id}`),
  publishDesign: (published) => client.post("/invitations/design/publish", { published }),
  saveDesign: (design) => client.put("/invitations/design/current", design),
  saveSettings: (settings) => client.patch("/invitations/settings/current", settings),
  uploadSignature: () => client.post("/media/signature"),
  deleteImage: (publicId) => client.delete("/media/image", { data: { publicId } }),
};

const publicClient = axios.create({ baseURL: API_URL, timeout: 20000 });

export const publicInvitation = {
  get: (token) => publicClient.get(`/public/invitations/${encodeURIComponent(token)}`),
  rsvp: (token, response) => publicClient.post(`/public/invitations/${encodeURIComponent(token)}/rsvp`, response),
};

export async function uploadToCloudinary(file) {
  let data;
  try {
    ({ data } = await invitations.uploadSignature());
  } catch (error) {
    if (error.response?.status === 503) {
      throw new Error(`Image uploads are unavailable. Check the Cloudinary settings on ${API_URL} and redeploy that API.`);
    }
    if (!error.response || error.response.status === 404) {
      throw new Error(`Studio could not reach the upload service at ${API_URL}. Check the API address and allowed Studio origin.`);
    }
    throw error;
  }
  const form = new FormData();
  form.append("file", file);
  form.append("api_key", data.apiKey);
  form.append("timestamp", data.timestamp);
  form.append("signature", data.signature);
  form.append("folder", data.folder);
  if (data.uploadPreset) form.append("upload_preset", data.uploadPreset);
  const response = await axios.post(
    `https://api.cloudinary.com/v1_1/${data.cloudName}/image/upload`,
    form,
    { timeout: 60000 },
  );
  return {
    publicId: response.data.public_id,
    secureUrl: response.data.secure_url,
    width: response.data.width,
    height: response.data.height,
    format: response.data.format,
    alt: "Wedding invitation cover photo",
  };
}

const sharedPath = (key) => "/public/invitations/event/" + encodeURIComponent(key);
export const sharedInvitation = {
  get: (key) => publicClient.get(sharedPath(key)),
  respond: (key, response) => publicClient.post(sharedPath(key) + "/rsvp", response),
};
