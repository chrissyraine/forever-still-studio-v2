module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const d = req.body;

  // Notion rich_text fields max 2000 chars
  const t = (str) => (str || '').slice(0, 1990);

  const budgetMap = {
    'under-500':  'Under 500',
    '500-1000':   '500 to 1000',
    '1000-2500':  '1000 to 2500',
    '2500-5000':  '2500 to 5000',
    '5000-plus':  '5000 plus',
  };
  const timelineMap = {
    'asap':        'ASAP',
    '1-2-months':  '1 to 2 months',
    '3-6-months':  '3 to 6 months',
    'exploring':   'Just exploring',
  };
  const photosMap  = { 'yes': 'Yes', 'some': 'Some', 'no': 'No' };
  const logoMap    = { 'yes': 'Yes', 'partial': 'Working on it', 'no': 'No' };
  const contentMap = { 'ready': 'Ready', 'partial': 'Partial', 'not-ready': 'Not ready' };

  const props = {
    'Business Name':      { title: [{ text: { content: t(d.businessName || 'Unnamed') } }] },
    'Owner Name':         { rich_text: [{ text: { content: t(d.ownerName) } }] },
    'Industry':           { rich_text: [{ text: { content: t(d.industry) } }] },
    'Location':           { rich_text: [{ text: { content: t(d.address) } }] },
    'Referral':           { rich_text: [{ text: { content: t(d.referral) } }] },
    'Elevator Pitch':     { rich_text: [{ text: { content: t(d.elevator) } }] },
    'What They Love':     { rich_text: [{ text: { content: t(d.love) } }] },
    'Customers':          { rich_text: [{ text: { content: t(d.customers) } }] },
    'Why Now':            { rich_text: [{ text: { content: t(d.whyNow) } }] },
    'Desired Action':     { rich_text: [{ text: { content: t(d.cta) } }] },
    'Biggest Problem':    { rich_text: [{ text: { content: t(d.biggestProblem) } }] },
    'Goal':               { rich_text: [{ text: { content: t(d.goal) } }] },
    'Visual Styles':      { rich_text: [{ text: { content: t(Array.isArray(d.visualStyles) ? d.visualStyles.join(', ') : (d.visualStyles || '')) } }] },
    'Color Palette':      { rich_text: [{ text: { content: t(Array.isArray(d.colorPalette) ? d.colorPalette.join(', ') : (d.colorPalette || '')) } }] },
    'Avoid Notes':        { rich_text: [{ text: { content: t(d.avoidNotes) } }] },
    'Tagline':            { rich_text: [{ text: { content: t(d.tagline) } }] },
    'Services Requested': { rich_text: [{ text: { content: t(Array.isArray(d.services) ? d.services.join(', ') : (d.services || '')) } }] },
    'Testimonials':       { rich_text: [{ text: { content: t(d.testimonials) } }] },
    'Status':             { select: { name: 'New' } },
  };

  if (d.email)     props['Email']      = { email: d.email };
  if (d.phone)     props['Phone']      = { phone_number: d.phone };
  if (d.driveLink) props['Drive Link'] = { url: d.driveLink };

  if (budgetMap[d.budget])             props['Budget']           = { select: { name: budgetMap[d.budget] } };
  if (timelineMap[d.timeline])         props['Timeline']         = { select: { name: timelineMap[d.timeline] } };
  if (photosMap[d.hasPhotos])          props['Has Photos']       = { select: { name: photosMap[d.hasPhotos] } };
  if (logoMap[d.hasLogo])              props['Has Logo']         = { select: { name: logoMap[d.hasLogo] } };
  if (contentMap[d.contentReadiness])  props['Content Readiness']= { select: { name: contentMap[d.contentReadiness] } };
  if (d.whoUpdates)                    props['Who Updates Site'] = { rich_text: [{ text: { content: d.whoUpdates } }] };
  if (d.maintenancePlan)               props['Maintenance Plan'] = { select: { name: d.maintenancePlan === 'yes' ? 'Yes' : 'No' } };

  try {
    // ── Save to Notion ──────────────────────────────────────────
    const notionRes = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: 'b55cd7f9983b476797a1cb59e47269f4' },
        properties: props,
      }),
    });

    if (!notionRes.ok) {
      const err = await notionRes.text();
      console.error('Notion error:', err);
      return res.status(500).json({ error: 'Failed to save to Notion', detail: err });
    }

    // ── Send email notification via Resend ──────────────────────
    const budgetLabel    = budgetMap[d.budget] || d.budget || 'Not specified';
    const timelineLabel  = timelineMap[d.timeline] || d.timeline || 'Not specified';

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Forever Still Studio <onboarding@resend.dev>',
        to: 'chrissy@foreverstillstudio.com',
        subject: `New Client Intake: ${d.businessName || 'New Lead'}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#1a1a1a;color:#f0ebe4;">
            <h2 style="color:#C8A96A;margin-bottom:4px;">New Client Intake</h2>
            <p style="color:#9c8c82;margin-top:0;font-size:13px;">Submitted via foreverstillstudio.com</p>
            <hr style="border:none;border-top:1px solid rgba(200,169,106,0.2);margin:24px 0;">

            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              <tr><td style="padding:8px 0;color:#9c8c82;width:40%;">Business Name</td><td style="padding:8px 0;color:#f0ebe4;">${d.businessName || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Owner Name</td><td style="padding:8px 0;color:#f0ebe4;">${d.ownerName || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Email</td><td style="padding:8px 0;color:#C8A96A;"><a href="mailto:${d.email}" style="color:#C8A96A;">${d.email || '—'}</a></td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Phone</td><td style="padding:8px 0;color:#f0ebe4;">${d.phone || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Industry</td><td style="padding:8px 0;color:#f0ebe4;">${d.industry || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Location</td><td style="padding:8px 0;color:#f0ebe4;">${d.address || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Budget</td><td style="padding:8px 0;color:#f0ebe4;">${budgetLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Timeline</td><td style="padding:8px 0;color:#f0ebe4;">${timelineLabel}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Services</td><td style="padding:8px 0;color:#f0ebe4;">${Array.isArray(d.services) ? d.services.join(', ') : (d.services || '—')}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Biggest Problem</td><td style="padding:8px 0;color:#f0ebe4;">${d.biggestProblem || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Goal</td><td style="padding:8px 0;color:#f0ebe4;">${d.goal || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Referral</td><td style="padding:8px 0;color:#f0ebe4;">${d.referral || '—'}</td></tr>
              <tr><td style="padding:8px 0;color:#9c8c82;">Tagline</td><td style="padding:8px 0;color:#f0ebe4;">${d.tagline || '—'}</td></tr>
            </table>

            <hr style="border:none;border-top:1px solid rgba(200,169,106,0.2);margin:24px 0;">
            <p style="font-size:12px;color:#9c8c82;text-align:center;">View full intake in <a href="https://notion.so" style="color:#C8A96A;">Notion</a></p>
          </div>
        `,
      }),
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
