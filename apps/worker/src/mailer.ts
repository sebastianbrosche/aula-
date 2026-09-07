import type { Mailer } from "@aula/core";

export function createMailer(apiKey: string | undefined, from: string): Mailer {
  return {
    async sendMagicLink(email, url) {
      if (!apiKey) {
        return false;
      }
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from,
          to: [email],
          subject: "aula login",
          html: `<p><a href="${url}">Open aula</a></p>`,
        }),
      });
      return response.ok;
    },
  };
}
