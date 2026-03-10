import https from 'https';

const auth = Buffer.from(
  process.env.MAILJET_API_KEY + ':' + process.env.MAILJET_SECRET_KEY
).toString('base64');

// Check last 10 messages
const req = https.request({
  hostname: 'api.mailjet.com',
  path: '/v3/REST/message?Limit=10&Sort=ArrivedAt+DESC',
  method: 'GET',
  headers: { Authorization: 'Basic ' + auth },
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const msgs = JSON.parse(d).Data;
    if (!msgs.length) { console.log('No messages found.'); return; }
    console.log('Recent Mailjet messages:');
    console.log('────────────────────────────────────────────────────────────');
    msgs.forEach(m => {
      console.log(`Time:    ${m.ArrivedAt}`);
      console.log(`To:      ${m.ToEmail}`);
      console.log(`Status:  ${m.Status}`);
      console.log(`MsgID:   ${m.ID}`);
      console.log('────────────────────────────────────────────────────────────');
    });
  });
});
req.on('error', e => console.error('Error:', e.message));
req.end();
