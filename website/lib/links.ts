/** Voice session lives in this Next app. Google sign-in stays on the API Worker. */
const API = (process.env.NEXT_PUBLIC_CLARTE_API ?? "http://localhost:8787").replace(/\/$/, "")

export const APP_URL = "/app"
export const GOOGLE_URL = `${API}/auth/google`
export const REPO_URL = "https://github.com/haminxx/Clarte"
