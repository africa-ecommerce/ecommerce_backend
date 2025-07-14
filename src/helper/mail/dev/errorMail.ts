// // helper/mail/notifyDevTeam.ts
// import { emailConfigs } from "../../../config";
// import { mail } from "../../../lib/mail";



// const { devTeam } = emailConfigs;
// export async function errorMail(formattedInput: any, error: any) {
//   const subject = `⚠️ Manual Order Required - ${formattedInput.buyerName}`;
//   const html = `
//     <div style="font-family: monospace, Arial; background: #fefefe; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
//       <h3 style="color: #b00020;">A customer's order failed and needs manual processing.</h3>
//       <p>Details:</p>
//       <pre style="background:#f4f4f4;padding:10px;border-radius:5px;font-size:13px;">
// ${JSON.stringify({ ...formattedInput, error: error.message }, null, 2)}
//       </pre>
//     </div>
//   `;

//   await mail("devTeam@pluggn.com.ng", subject, html, devTeam);
// }



// helper/mail/errorMail.ts
import { emailConfigs } from "../../../config";
import { mail } from "../../../lib/mail";

const { devTeam } = emailConfigs;

const SENSITIVE_KEYS = ["password", "token", "refreshToken", "accessToken"];

function sanitize(obj: any) {
  if (!obj || typeof obj !== "object") return obj;
  const clone = JSON.parse(JSON.stringify(obj));
  for (const key of Object.keys(clone)) {
    if (SENSITIVE_KEYS.includes(key.toLowerCase())) {
      clone[key] = "***";
    }
  }
  return clone;
}

export async function errorMail(req: any, error: any) {
  const subject = `🚨 Error in ${req.method} ${req.originalUrl}`;

  const requestDetails = {
    method: req.method,
    url: req.originalUrl,
    headers: sanitize(req.headers),
    params: sanitize(req.params),
    query: sanitize(req.query),
    body: sanitize(req.body),
    files: req.files ? Object.keys(req.files) : undefined,
  };

  const html = `
    <div style="font-family: Arial, sans-serif; background: #fefefe; padding: 20px; border: 1px solid #ccc; border-radius: 6px;">
      <h2 style="color: #d32f2f;">🚨 Application Error Alert</h2>

      <h3 style="margin-top: 20px;">🧾 Request Info:</h3>
      <pre style="background: #f8f8f8; padding: 10px; border-radius: 5px; font-size: 13px;">
${JSON.stringify(requestDetails, null, 2)}
      </pre>

      <h3 style="margin-top: 20px;">🚨 Error Details:</h3>
      <pre style="background: #fff3f3; padding: 10px; border-radius: 5px; font-size: 13px; color: #b00020;">
${error?.message || error}
${error?.stack || ""}
      </pre>
    </div>
  `;

  await mail("devTeam@pluggn.com.ng", subject, html, devTeam);
}
