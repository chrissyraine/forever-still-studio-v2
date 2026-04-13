module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const d = req.body;

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
    'Business Name':      { title: [{ text: { content: d.businessName || 'Unnamed' } }] },
    'Owner Name':         { rich_text: [{ text: { content: d.ownerName || '' } }] },
    'Industry':           { rich_text: [{ text: { content: d.industry || '' } }] },
    'Location':           { rich_text: [{ text: { content: d.address || '' } }] },
    'Referral':           { rich_text: [{ text: { content: d.referral || '' } }] },
    'Biggest Problem':    { rich_text: [{ text: { content: d.biggestProblem || '' } }] },
    'Goal':               { rich_text: [{ text: { content: d.goal || '' } }] },
    'Visual Styles':      { rich_text: [{ text: { content: Array.isArray(d.visualStyles) ? d.visualStyles.join(', ') : (d.visualStyles || '') } }] },
    'Color Palette':      { rich_text: [{ text: { content: Array.isArray(d.colorPalette) ? d.colorPalette.join(', ') : (d.colorPalette || '') } }] },
    'Avoid Notes':        { rich_text: [{ text: { content: d.avoidNotes || '' } }] },
    'Services Requested': { rich_text: [{ text: { content: Array.isArray(d.services) ? d.services.join(', ') : (d.services || '') } }] },
    'Testimonials':       { rich_text: [{ text: { content: d.testimonials || '' } }] },
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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Handler error:', err);
    return res.status(500).json({ error: 'Server error', detail: err.message });
  }
};
