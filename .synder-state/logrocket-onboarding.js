/**
 * LogRocket onboarding deep dive via Galileo AI API
 */
const https = require('https');
const fs = require('fs');

const ORG = 'vn4kxj';
const APP = 'synder_test';
const API_KEY = 'vn4kxj:synder_test:gy2Tjqcc5zYlbpCh88po';
const BASE = `api.logrocket.com`;

let globalChatID = null;

function ask(message, chatID) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ message, chatID: chatID || globalChatID || undefined });
    const opts = {
      hostname: BASE,
      path: `/v1/orgs/${ORG}/apps/${APP}/ask-galileo/`,
      method: 'POST',
      headers: {
        'Authorization': `Token ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };
    const req = https.request(opts, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.chatID && !globalChatID) globalChatID = parsed.chatID;
          resolve(parsed);
        } catch(e) {
          resolve({ raw: data });
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function query(question, waitMs = 25000) {
  console.log(`\nQ: ${question}`);
  const r1 = await ask(question);
  console.log(`  → chatID: ${r1.chatID || globalChatID}, status: ${r1.status || 'sent'}`);
  await sleep(waitMs);
  // Fetch result with follow-up
  const r2 = await ask('What are the results?', r1.chatID || globalChatID);
  console.log(`  → Result:`, JSON.stringify(r2).substring(0, 500));
  return { question, result: r2 };
}

(async () => {
  const results = {};

  // Q1: Onboarding funnel - sessions and step-by-step drop-off
  const q1chatID = `onb-funnel-${Date.now()}`;
  console.log('\n[1] Onboarding funnel drop-off by step');
  const r1a = await ask(
    'Analyze sessions that visited /onboarding/index in the last 90 days. Show me: total sessions, how many completed each onboarding step (tell us about you, provide business details / client details, select integrations, connect integrations), and drop-off rate at each step. Also show the completion rate (reached dashboard after onboarding).',
    q1chatID
  );
  results.q1_chatID = r1a.chatID || q1chatID;
  console.log('Q1 sent, chatID:', results.q1_chatID);
  
  await sleep(30000);
  
  const r1b = await ask('What are the results from that onboarding funnel analysis?', results.q1_chatID);
  console.log('Q1 result:', JSON.stringify(r1b).substring(0, 1000));
  results.q1 = r1b;

  // Q2: Time spent on each onboarding step
  const q2chatID = `onb-time-${Date.now()}`;
  console.log('\n[2] Time spent on each onboarding step');
  const r2a = await ask(
    'For sessions on /onboarding/index in the last 90 days, what is the average time users spend on each onboarding step before either proceeding or abandoning? Which step has the longest average time?',
    q2chatID
  );
  await sleep(30000);
  const r2b = await ask('What are the results?', r2a.chatID || q2chatID);
  console.log('Q2 result:', JSON.stringify(r2b).substring(0, 1000));
  results.q2 = r2b;

  // Q3: Role selection - which roles do users pick
  const q3chatID = `onb-roles-${Date.now()}`;
  console.log('\n[3] Role distribution');
  const r3a = await ask(
    'In onboarding sessions at /onboarding/index, what role options do users select most often (Business owner, Accounting firm, Staff Accountant, etc.)? Show distribution and which roles have highest drop-off.',
    q3chatID
  );
  await sleep(30000);
  const r3b = await ask('What are the results?', r3a.chatID || q3chatID);
  console.log('Q3 result:', JSON.stringify(r3b).substring(0, 1000));
  results.q3 = r3b;

  // Q4: JavaScript errors during onboarding
  const q4chatID = `onb-errors-${Date.now()}`;
  console.log('\n[4] JS errors during onboarding');
  const r4a = await ask(
    'What JavaScript errors or console errors occur most frequently in sessions on /onboarding/index? List top errors, their frequency, and whether they correlate with abandonment.',
    q4chatID
  );
  await sleep(30000);
  const r4b = await ask('What are the results?', r4a.chatID || q4chatID);
  console.log('Q4 result:', JSON.stringify(r4b).substring(0, 1000));
  results.q4 = r4b;

  // Q5: User behavior patterns - rage clicks, dead clicks
  const q5chatID = `onb-clicks-${Date.now()}`;
  console.log('\n[5] Rage clicks and dead clicks in onboarding');
  const r5a = await ask(
    'In onboarding sessions, what are the most common rage-click and dead-click elements? Which UI elements cause the most user frustration?',
    q5chatID
  );
  await sleep(30000);
  const r5b = await ask('What are the results?', r5a.chatID || q5chatID);
  console.log('Q5 result:', JSON.stringify(r5b).substring(0, 1000));
  results.q5 = r5b;

  // Q6: What pages do users go to after onboarding?
  const q6chatID = `onb-after-${Date.now()}`;
  console.log('\n[6] Post-onboarding navigation');
  const r6a = await ask(
    'For users who completed onboarding (/onboarding/index) and reached the main app, what are the top pages they visit first? What percentage return within 7 days?',
    q6chatID
  );
  await sleep(30000);
  const r6b = await ask('What are the results?', r6a.chatID || q6chatID);
  console.log('Q6 result:', JSON.stringify(r6b).substring(0, 1000));
  results.q6 = r6b;

  fs.writeFileSync('/home/ubuntu/.openclaw/workspace/.synder-state/logrocket-onb-results.json', JSON.stringify(results, null, 2));
  console.log('\n===== LOGROCKET ANALYSIS COMPLETE =====');
  console.log('Results saved to logrocket-onb-results.json');
})();
