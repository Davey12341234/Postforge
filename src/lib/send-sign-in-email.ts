export type SendSignInEmailParams = {
  to: string;
  magicUrl: string;
};

/**
 * Sends magic link via Resend (https://resend.com). Requires RESEND_API_KEY + EMAIL_FROM.
 */
export async function sendMagicLinkEmail(params: SendSignInEmailParams): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!apiKey || !from) {
    return { ok: false, error: "RESEND_API_KEY or EMAIL_FROM missing." };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [params.to],
      subject: "Sign in to bbGPT",
      html: `
        <p>You requested a sign-in link for bbGPT.</p>
        <p><a href="${params.magicUrl}">Click here to sign in</a> (expires in 15 minutes).</p>
        <p style="color:#666;font-size:12px">If you did not request this, ignore this email.</p>
      `.trim(),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return { ok: false, error: text || `Resend HTTP ${res.status}` };
  }
  return { ok: true };
}
