import type { Mailer } from "@aula/core";

export const DEFAULT_RESEND_FROM = "aula <onboarding@resend.dev>";

export function createMailer(
  apiKey: string | undefined,
  from: string | undefined,
): Mailer {
  const configured = Boolean(apiKey);
  return {
    configured,
    async sendMagicLink(email, url) {
      if (!apiKey) {
        return false;
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
        return response.ok;
      } catch {
        return false;
      }
    },
  };
}
