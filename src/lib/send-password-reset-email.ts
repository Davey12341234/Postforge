export type SendPasswordResetEmailParams = {
  to: string;
  resetUrl: string;
};

/**
 * Sends password reset link via Resend. Requires RESEND_API_KEY + EMAIL_FROM.
 */
export async function sendPasswordResetEmail(
  params: SendPasswordResetEmailParams,
): Promise<{ ok: boolean; error?: string }> {
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
      subject: "Reset your bbGPT password",
      html: `
        <p>You requested a password reset for bbGPT.</p>
        <p><a href="${params.resetUrl}">Choose a new password</a> (link expires in 1 hour).</p>
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
