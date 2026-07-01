# Vertex AI setup — EU region + service-account key

Goal: give the server-side visualizer proxy access to Gemini image models in the **EU**, via a **service-account key** (never a consumer AI Studio key). Do this in the Google Cloud Console. ~15 minutes.

> Do NOT paste the JSON key into chat. Put it straight into `.env.local` yourself (see step 9). Secrets never travel through chat.

---

## 1. Create the project
console.cloud.google.com → project picker (top bar) → **New Project** → name it `brushly-visualizer` → Create. Note the **Project ID** (looks like `brushly-visualizer-xxxxxx`, not the display name).

## 2. Enable billing
Left menu → **Billing** → link a billing account (add a card). Vertex AI needs billing on; new accounts get free trial credit. No spend happens until we call the API, and we cap it in code.

## 3. Enable the Vertex AI API
The console search is unreliable here (searching "Vertex AI API" returns unrelated results like *Vertex AI Search for commerce* and *AlloyDB* — ignore those). Open the API directly instead:

```
https://console.cloud.google.com/apis/library/aiplatform.googleapis.com?project=brushly-visualizer
```

Click **Enable**. If it shows **Manage**, it's already enabled — done. (Note: the "Vertex AI is now Gemini Enterprise Agent Platform" banner is a rebrand only; the API ID is still `aiplatform.googleapis.com`.)

## 4. Region (no toggle — chosen in code)
We'll call the EU endpoint. Default **`europe-west3`** (Frankfurt); `europe-west4` (Netherlands) also fine. Just tell me which; I default to `europe-west3`.

## 5. Confirm model access
**Vertex AI → Model Garden** → search **"Gemini 3 Pro Image"** (a.k.a. Nano Banana Pro) and **"Gemini Flash Image"**. If either shows **Enable** or **Request access**, click it. Some image models need enabling before first use.

## 6. Create the service account
**IAM & Admin → Service Accounts → Create service account**
- Name: `visualizer-proxy`
- Grant role: **Vertex AI User** (`roles/aiplatform.user`) — this only. Least privilege.
- Done.

## 7. Create the JSON key
Click the new service account → **Keys** tab → **Add key → Create new key → JSON → Create**. A `.json` file downloads. **This file is the secret.** Never commit it, never put it in the browser, never paste it in chat.

## 8. (Recommended) data governance
Cloud DPA applies by default on the paid tier and Google does **not** train on your data. If you want prompt/response logging off (tighter retention), check **Vertex AI → Settings** for the data-logging/abuse-logging toggle and turn it off. Our own 30-day auto-delete is separate and already planned.

## 9. Give me the values (safely)
Add these to `/Users/ZapEc/Desktop/brushly-site/.env.local` yourself (I've matched the names the code uses):

```
GCP_PROJECT_ID=your-project-id
GCP_LOCATION=europe-west3
# Paste the FULL contents of the downloaded JSON on one line, OR base64 it.
# Easiest: base64 it so it's a single safe line:
#   macOS:  base64 -i ~/Downloads/your-key.json | pbcopy   (then paste after the =)
GCP_SERVICE_ACCOUNT_KEY=eyJ0eXAiOi...   # base64 of the JSON (or the raw JSON)
VISUALIZER_ENGINE=vertex                 # leave as 'mock' until you're ready to spend
VISUALIZER_MONTHLY_CAP_PENCE=15000       # £150 hard cap; tune later
```

Then tell me in chat only: your **Project ID** and **region** (those aren't secret). Keep the key in `.env.local`.

## 10. For production (Vercel)
Same three secret vars go in **Vercel → Project → Settings → Environment Variables** (Production + Preview). Store `GCP_SERVICE_ACCOUNT_KEY` as the base64 string. Rotate the key any time from step 7 if it ever leaks.

---

### What you're NOT doing (on purpose)
- Not using an AI Studio API key (consumer tier — no DPA/residency control).
- Not committing the JSON or pasting it in chat.
- Not granting the service account Owner/Editor — only Vertex AI User.
