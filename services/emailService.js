const fs = require('fs');
const path = require('path');

const TOOLBOX_TOPICS_DIR = path.join(__dirname, '..', 'toolbox-topics');

const SAMPLE_TALK_FILES = [
  {
    filename: 'Talk_01_Fall_Protection.docx',
    label: 'Talk #1 — Fall Protection on Pitched Roofs (Cal/OSHA §1731)',
  },
  {
    filename: 'Talk_07_Heat_Illness_Prevention.docx',
    label: 'Talk #7 — Heat Illness Prevention (Cal/OSHA §3396)',
  },
  {
    filename: 'Talk_13_PPE_Selection_Use.docx',
    label: 'Talk #13 — PPE Selection & Use (29 CFR 1926.95(c))',
  },
];

function buildSampleTalksHtml(firstName) {
  const safeName = String(firstName || 'there').replace(/[<>&"']/g, '');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your free toolbox talks from RoofSafe Pro</title>
</head>
<body style="margin:0;padding:0;background:#f3f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#0a1d36;">
  <div style="max-width:600px;margin:0 auto;padding:0;background:#fff;">
    <div style="background:#061b3a;padding:24px 32px;text-align:left;">
      <span style="display:inline-block;width:32px;height:32px;border-radius:6px;background:#f6bd16;color:#061b3a;font-weight:900;font-size:18px;line-height:32px;text-align:center;vertical-align:middle;">R</span>
      <span style="display:inline-block;margin-left:10px;color:#fff;font-size:18px;font-weight:800;vertical-align:middle;">RoofSafe Pro</span>
    </div>
    <div style="padding:32px;">
      <h1 style="margin:0 0 14px;color:#061b3a;font-size:22px;font-weight:900;line-height:1.3;">Hi ${safeName} — your 3 talks are attached.</h1>
      <p style="margin:0 0 16px;color:#41546e;font-size:15px;line-height:1.6;">
        Thanks for trying RoofSafe Pro. Three real toolbox talks are attached to this email, ready to print and run with your crew this week. Each one ties to a recently-changed Cal/OSHA or federal OSHA rule.
      </p>
      <table role="presentation" style="margin:18px 0;border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:10px 14px;border:1px solid #d9e1ea;border-radius:8px;background:#f3f7fb;color:#0a1d36;font-size:14px;font-weight:700;">
            📎 Talk #1 — Fall Protection on Pitched Roofs<br/>
            <span style="font-weight:400;color:#5f6f84;font-size:13px;">Ties to the new Cal/OSHA §1731 6-foot rule</span>
          </td>
        </tr>
      </table>
      <table role="presentation" style="margin:8px 0;border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:10px 14px;border:1px solid #d9e1ea;border-radius:8px;background:#f3f7fb;color:#0a1d36;font-size:14px;font-weight:700;">
            📎 Talk #7 — Heat Illness Prevention<br/>
            <span style="font-weight:400;color:#5f6f84;font-size:13px;">Ties to the new Cal/OSHA §3396 indoor heat rule</span>
          </td>
        </tr>
      </table>
      <table role="presentation" style="margin:8px 0 22px;border-collapse:collapse;width:100%;">
        <tr>
          <td style="padding:10px 14px;border:1px solid #d9e1ea;border-radius:8px;background:#f3f7fb;color:#0a1d36;font-size:14px;font-weight:700;">
            📎 Talk #13 — PPE Selection &amp; Use<br/>
            <span style="font-weight:400;color:#5f6f84;font-size:13px;">Ties to the new federal 29 CFR 1926.95(c) PPE fit rule</span>
          </td>
        </tr>
      </table>
      <h2 style="margin:24px 0 10px;color:#061b3a;font-size:16px;font-weight:900;">How to run a meeting</h2>
      <ol style="margin:0 0 22px;padding-left:20px;color:#41546e;font-size:14px;line-height:1.7;">
        <li>Print the talk and the sign-in sheet.</li>
        <li>Read the talk aloud with your crew on the jobsite.</li>
        <li>Have every worker sign the attendance sheet.</li>
        <li>Keep the signed sheet on file — Cal/OSHA inspectors can request up to 3 years of records.</li>
      </ol>
      <div style="margin:24px 0;padding:18px 20px;border-radius:10px;background:#fffaf0;border:1px solid #f3dca4;">
        <p style="margin:0 0 10px;color:#061b3a;font-size:14px;font-weight:800;">Liked these? Get the full bundle.</p>
        <p style="margin:0 0 14px;color:#41546e;font-size:14px;line-height:1.6;">
          The complete bundle has 27 more talks (10 topics × 3) plus a custom IIPP filled in with your company details. One-time purchase, no subscription.
        </p>
        <a href="https://roofsafepro.com/#pricing" style="display:inline-block;padding:12px 22px;border-radius:8px;background:#f6bd16;color:#061b3a;font-size:14px;font-weight:800;text-decoration:none;">
          See pricing →
        </a>
      </div>
      <p style="margin:24px 0 0;color:#5f6f84;font-size:13px;line-height:1.6;">
        Questions? Just reply to this email. We read every message.
      </p>
    </div>
    <div style="padding:18px 32px;background:#061b3a;color:#cbd8e7;font-size:12px;line-height:1.6;">
      RoofSafe Pro · Cal/OSHA compliance support for California roofing contractors.<br/>
      <a href="mailto:support@roofsafepro.com" style="color:#f6bd16;font-weight:700;text-decoration:none;">support@roofsafepro.com</a>
    </div>
  </div>
</body>
</html>`;
}

function buildAttachments() {
  return SAMPLE_TALK_FILES.map(({ filename }) => {
    const filepath = path.join(TOOLBOX_TOPICS_DIR, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Sample talk file missing: ${filename}`);
    }
    return {
      filename,
      content: fs.readFileSync(filepath).toString('base64'),
    };
  });
}

async function sendSampleTalksEmail(lead) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`[emailService] RESEND_API_KEY not set — skipping send for ${lead.email}. Lead is saved; can be emailed later.`);
    return { sent: false, reason: 'missing_api_key' };
  }

  const fromEmail = process.env.RESEND_FROM_EMAIL || 'RoofSafe Pro <onboarding@resend.dev>';

  const payload = {
    from: fromEmail,
    to: [lead.email],
    subject: 'Your 3 free toolbox talks from RoofSafe Pro',
    html: buildSampleTalksHtml(lead.first_name),
    attachments: buildAttachments(),
    tags: [
      { name: 'source', value: 'lead-magnet' },
      { name: 'state', value: String(lead.state || 'unknown') },
    ],
  };

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Resend API error ${response.status}: ${body}`);
  }

  const data = await response.json();
  return { sent: true, id: data.id };
}

module.exports = { sendSampleTalksEmail };
