import type { Mailer, MailSendResult } from "@aula/core";

export const DEFAULT_RESEND_FROM = "aula <login@m1.heatlagos.com>";
const REASON_MAX = 160;

export function safeResendReason(status: number, body: string): string {
  const snippet = body
    .replace(/re_[A-Za-z0-9_]+/g, "[redacted]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, REASON_MAX);
  return snippet ? `${status} ${snippet}` : String(status);
}

export function createMailer(
  apiKey: string | undefined,
  from: string | undefined,
): Mailer {
  const configured = Boolean(apiKey);
  return {
    configured,
    async sendMagicLink(email, url): Promise<MailSendResult> {
      if (!apiKey) {
        return { sent: false };
      }
      try {
        const response = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: from?.trim() || DEFAULT_RESEND_FROM,
            to: [email],
            subject: "aula login",
            html: `<p><a href="${url}">Open aula</a></p>`,
          }),
        });
        if (response.ok) {
          return { sent: true };
        }
        const body = await response.text();
        return { sent: false, reason: safeResendReason(response.status, body) };
      } catch {
        return { sent: false, reason: "network" };
      }
    },
  };
}
