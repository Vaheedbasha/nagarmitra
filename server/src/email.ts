import { config } from "./config.js";

interface VerificationEmailInput {
  name: string;
  email: string;
  token: string;
  city?: string;
}

export function buildVerificationHtml({ name, email, token, city }: VerificationEmailInput): string {
  const baseUrl = config.publicAppUrl.replace(/\/$/, "");
  const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(token)}`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your NagarMitra Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f6fa; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f6fa; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 540px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.05);">
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); padding: 32px 28px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NagarMitra</h1>
              <p style="margin: 6px 0 0; color: #e0e7ff; font-size: 13px; font-weight: 500;">Municipal Civic Intelligence Platform</p>
            </td>
          </tr>

          <!-- Content Body -->
          <tr>
            <td style="padding: 32px 28px;">
              <h2 style="margin: 0 0 12px; color: #0f172a; font-size: 20px; font-weight: 700;">Verify your email address</h2>
              <p style="margin: 0 0 20px; color: #475569; font-size: 14px; line-height: 1.6;">
                Hello <strong>${name}</strong>,<br>
                Thank you for joining NagarMitra for <strong>${city || "your city"}</strong>. To activate your account and start reporting civic issues directly to municipal ward teams, please verify your email address.
              </p>

              <!-- One-Click Button -->
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin: 28px 0;">
                <tr>
                  <td align="center" style="border-radius: 12px; background-color: #4f46e5;">
                    <a href="${verificationLink}" target="_blank" style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 12px; background-color: #4f46e5;">
                      Verify Email Address
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 12px; color: #64748b; font-size: 12px; line-height: 1.5;">
                Or copy and paste this verification URL into your browser:
              </p>
              <p style="margin: 0 0 24px; word-break: break-all; background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; font-size: 11px; color: #4338ca; font-family: monospace;">
                ${verificationLink}
              </p>

              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;">

              <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                This link will expire in 24 hours. If you did not create a NagarMitra account with this email address, you can safely disregard this message.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 18px 28px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #94a3b8; font-size: 11px;">
                © 2026 NagarMitra Civic Intelligence · Direct Citizen-to-Ward Platform
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function sendVerificationEmail(input: VerificationEmailInput): Promise<{
  sent: boolean;
  previewUrl: string;
  error?: string;
}> {
  const baseUrl = config.publicAppUrl.replace(/\/$/, "");
  const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(input.token)}`;

  // If Resend API key is configured, send the real email via Resend API
  if (config.email.resendApiKey) {
    try {
      const html = buildVerificationHtml(input);
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.email.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: config.email.fromEmail || "NagarMitra <onboarding@resend.dev>",
          to: [input.email],
          subject: "Verify your NagarMitra citizen account",
          html,
        }),
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as Record<string, any>;
        console.warn("[email] Resend API error:", errJson);
        return {
          sent: false,
          previewUrl: verificationLink,
          error: errJson.message || `Resend returned HTTP ${res.status}`,
        };
      }

      const data = (await res.json()) as Record<string, any>;
      console.log(`[email] Verification email dispatched to ${input.email} via Resend. ID:`, data.id);
      return { sent: true, previewUrl: verificationLink };
    } catch (err) {
      console.warn("[email] Failed to dispatch via Resend:", err);
      return {
        sent: false,
        previewUrl: verificationLink,
        error: err instanceof Error ? err.message : "Network error",
      };
    }
  }

  // Fallback when Resend API key is not configured: log to console & return preview URL
  console.log(`[email] RESEND_API_KEY not configured. Verification link for ${input.email}:`);
  console.log(`[email] -> ${verificationLink}`);
  return { sent: false, previewUrl: verificationLink };
}
