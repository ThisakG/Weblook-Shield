/**
 * seed.js
 * ----------------------------------------------------------------------------
 * WHY THIS FILE EXISTS:
 *   The assignment specification says to use Weblook's actual policy
 *   documents and training content "as guidelines/references when creating
 *   the web application." Rather than seed the demo with placeholder
 *   "Lorem ipsum" policies, this script loads the REAL six-module security
 *   awareness course and the REAL six-policy library (WSP-01..WSP-06) taken
 *   directly from the Weblook source documents, so the running application
 *   demonstrates the actual content Weblook will use.
 *
 * HOW TO RUN:
 *   node backend/src/db/seed.js
 *   (also run automatically by `npm run seed` — see backend/package.json)
 *
 * SAFE TO RE-RUN:
 *   Uses ON CONFLICT / existence checks so re-running does not duplicate
 *   rows — useful while iterating locally.
 * ----------------------------------------------------------------------------
 */
const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

// Demo accounts, one per role, so graders can log in immediately without
// registering. Passwords are hashed with bcrypt before insertion — never
// stored in plaintext, consistent with WSP-04 and the Security NFR.
const DEMO_USERS = [
  { full_name: 'Alex System-Owner',    email: 'owner@weblook.com', password: 'OwnerPass!2026',   role_id: 3, department: 'Executive' },
  { full_name: 'Priya Administrator',  email: 'admin@weblook.com', password: 'AdminPass!2026',   role_id: 2, department: 'IT Administration' },
  { full_name: 'Jordan Employee',      email: 'employee@weblook.com', password: 'EmployeePass!2026', role_id: 1, department: 'Software Engineering' },
];

// The six WSP policies, condensed from
// Weblook_International_Information_Security_Policy_Library-corrected.docx
const POLICIES = [
  {
    code: 'WSP-01', title: 'Acceptable Use Policy', category: 'Acceptable Use', owner: 'Chief Operations Officer (COO)', is_device_policy: true,
    content: `Purpose: Defines acceptable use of Weblook's information systems, accounts, devices and network resources to protect the organisation, employees and clients from data loss, service disruption, legal liability and reputational damage.

Scope: Applies to all Weblook-owned or Weblook-managed devices, accounts, networks and software, and to any personal device used to access Weblook systems, whether on-site or remote.

Policy Statement:
- Company systems must be used primarily for legitimate business purposes; incidental personal use is permitted if it does not interfere with duties or create risk.
- Users may only access systems and data they are authorised to use, and must never try to bypass access controls or monitoring.
- Users are responsible for all activity performed under their own credentials and must never share login credentials.
- Before connecting to the internal network, users must set their device name to their own name (e.g. "Jane Perera - Laptop").
- Devices are tracked in the live asset inventory; employees may view assigned assets and request additional assets through the asset-request workflow.
- Lost or stolen devices must be reported immediately through the incident reporting workflow.
- Installing unauthorised software, disabling security controls, harassment, and sharing confidential data outside approved channels are all prohibited.

Enforcement: Violations are reviewed by administrators and escalated according to severity, from a documented reminder up to disciplinary action or termination of access, per Weblook's HR procedures. All enforcement actions are logged to the audit trail.

Review: At least annually, or sooner after a material change or significant security incident.`
  },
  {
    code: 'WSP-02', title: 'Data Protection Policy', category: 'Data Protection', owner: 'Chief Operations Officer (COO)', is_device_policy: false,
    content: `Purpose: Establishes how Weblook collects, uses, protects and retains personal and confidential data, including employee data processed within Weblook Shield.

Policy Statement:
- Weblook collects account/profile information, role assignments, policy acknowledgements, training and quiz results, authentication/activity logs and asset requests, strictly for information-security governance purposes — never for performance evaluation, marketing or general surveillance.
- Individual-level data is restricted to administrators and the relevant department head. The System Owner receives read-only access to aggregate compliance data only, never individual behavioural detail.
- All access to personal data is logged to the append-only audit trail.
- Data in transit is protected using TLS; passwords are stored using salted hashing (bcrypt/argon2) and are never stored or transmitted in plain text.
- Confidential data must not be exported, copied or shared outside approved channels.
- Retention periods are documented and reviewed periodically; employees may request clarification on what data is held about them through an administrator or department head.

Enforcement: Misuse of personal or confidential data is treated as a serious violation and escalated for disciplinary review. Suspected incidents must be reported immediately.`
  },
  {
    code: 'WSP-03', title: 'Remote Working Security Policy', category: 'Remote Working', owner: 'Chief Operations Officer (COO)', is_device_policy: false,
    content: `Purpose: Sets out security requirements for employees accessing Weblook systems while working remotely, so the organisation's security posture is maintained regardless of physical location.

Policy Statement:
- Avoid accessing company systems over unsecured public Wi-Fi without an encrypted connection; keep home router firmware updated and avoid default admin credentials.
- Devices must be locked whenever unattended, even at home, and must not be shared with family members or housemates.
- Keep company data off personal, unmanaged devices where an approved company device or system is available.
- Be mindful of visible screens and audible conversations involving sensitive information in shared or public spaces, including video calls.
- Remote working does not exempt employees from policy-acknowledgement deadlines or training requirements; reminders apply identically regardless of location.
- Lost, stolen or compromised devices must be reported immediately through the incident reporting workflow, regardless of location or time of day.

Enforcement: Repeated or serious disregard for remote-working requirements may result in restricted remote-access privileges or disciplinary review.`
  },
  {
    code: 'WSP-04', title: 'Password & Authentication Policy', category: 'Authentication', owner: 'Chief Operations Officer (COO)', is_device_policy: false,
    content: `Purpose: Defines minimum requirements for passwords and authentication on Weblook Shield to reduce the risk of account compromise.

Policy Statement:
- Passwords must be at least 14 characters, unique to Weblook systems, and never reused from a personal or third-party account.
- Passwords are stored using salted hashing (bcrypt/argon2) and are never visible in plain text to any administrator or system component.
- Passwords must be changed immediately if exposure is suspected; resets are handled securely via IT Administration or the self-service reset workflow.
- Multi-factor authentication (TOTP, e.g. Google Authenticator) is available to all users and mandatory for Administrator and System Owner roles.
- One-time codes must never be shared with anyone, including anyone claiming to represent Weblook IT.
- Repeated failed login attempts trigger an automatic, temporary account lockout and an alert to the security team.
- All authentication events (login, logout, failed attempts, resets, MFA changes) are logged to the audit trail.

Enforcement: Sharing credentials or 2FA codes, or attempting to bypass authentication controls, is a serious violation subject to disciplinary review regardless of whether harm resulted.`
  },
  {
    code: 'WSP-05', title: 'Access Control Policy (RBAC)', category: 'Access Control', owner: 'Chief Operations Officer (COO)', is_device_policy: false,
    content: `Purpose: Establishes how access to Weblook's systems, networks, applications and facilities is granted, reviewed and revoked, built on least privilege, need-to-know and default-deny.

Policy Statement:
- Least privilege: every account is granted the minimum access necessary to perform its function.
- Need-to-know: access to confidential data is limited to those who require it for a legitimate business purpose.
- Default-deny: access is denied by default and must be explicitly granted and justified.
- Segregation of duties: no individual may both request and approve their own access.
- Onboarding/offboarding: access is provisioned only after HR confirms employment and a manager specifies role/access; access is revoked no later than the employee's last working day.
- Access across all systems is formally reviewed at least every six months; unexplained or stale access is removed promptly and the removal logged.
- Third-party/vendor access is time-bound, minimum necessary, and revoked immediately once the engagement ends.

Enforcement: Unauthorised privilege escalation or granting access outside documented approval is a serious violation subject to immediate review.`
  },
  {
    code: 'WSP-06', title: 'Incident Reporting & Response Policy', category: 'Incident Response', owner: 'Chief Operations Officer (COO)', is_device_policy: false,
    content: `Purpose: Defines what constitutes a reportable security incident, how incidents are reported, and how Weblook responds — so issues are identified and contained as early as possible.

Policy Statement:
- Reportable events include suspicious messages, lost/stolen devices, unexpected authentication activity, accidental data disclosure, or anything inconsistent with normal authorised use.
- Incidents are reported through the incident reporting workflow as soon as they are identified; reporters do not need to be certain the incident is malicious — the security team assesses and escalates.
- Reports are reviewed by administrators and cross-referenced against the append-only audit trail.
- Good-faith reporting — including reporting one's own mistake — is treated as a positive, responsible action, never grounds for disciplinary action by itself. Concealing a known incident is treated more seriously than the incident itself.

Enforcement: Failure to report a known incident, or deliberate concealment, is treated as a serious violation.`
  },
];

// The six security-awareness training modules, condensed from
// Weblook_Shield_Security_Awareness_Training_Content.docx, each with its
// real quiz questions and answer key from Appendix A of that document.
//
// video_url: the companion clip from Weblook's own YouTube channel for each
// module, shown as a clickable thumbnail card right under the module title
// (see frontend/src/components/YouTubeCard.jsx). It opens in a new tab on
// click rather than embedding an inline player, per the team's decision.
//
// >>> REPLACE THE PLACEHOLDER URLS BELOW WITH YOUR REAL VIDEO LINKS <<<
// Any full YouTube URL works (youtube.com/watch?v=..., youtu.be/...). After
// editing, re-run `npm run seed` — the seed script UPDATEs video_url on
// modules that already exist, so this is safe to run again on a database
// that's already been seeded once (see the seed() function below).
// Leave a value as '' (empty string) to show no video card for that module.
const MODULES = [
  {
    title: 'Password Hygiene & Authentication Security',
    description: 'Why weak or reused passwords are the leading cause of account compromise, and how MFA protects you even if a password is stolen.',
    estimated_minutes: 10,
    video_url: 'https://youtu.be/K45rbsdJndE',
    lesson_content: `Weak, reused and predictable passwords remain the single most common entry point attackers use to compromise corporate accounts. A password leaked from an unrelated site can be tried automatically ("credential stuffing") against your Weblook Shield account.

Length beats complexity: a long passphrase of several unrelated words is easier to remember and harder to crack than a short, complex-looking password. Aim for at least 14 characters, avoid personal details, and never reuse your Weblook Shield password elsewhere.

Weblook Shield supports time-based one-time passcodes (TOTP) as a second factor. Even if your password is stolen, an attacker cannot log in without your authenticator device. 2FA is mandatory for Administrator and System Owner roles, and strongly recommended for everyone else. Never share a one-time code with anyone — Weblook Shield staff will never ask for it.

If you suspect your password has been exposed, contact IT Administration immediately to reset it, and report the incident through the platform. Repeated failed logins automatically lock the account and alert the security team — this is a protective control, not a punishment.`,
    questions: [
      { prompt: 'Why is reusing the same password across multiple websites risky?', options: [['A','It is not actually risky if the password is long'],['B','It makes the password harder for you to remember'],['C','It slows down the Weblook Shield login page'],['D','A leak on one site lets attackers try the same password on your other accounts']], correct: 'D' },
      { prompt: 'Which of the following is the strongest password strategy?', options: [['A','A short password with a mix of symbols, e.g., P@55!'],['B','Your name followed by your birth year'],['C','A long, unique passphrase of several unrelated words'],['D','The same password used for every corporate system']], correct: 'C' },
      { prompt: 'What does 2FA protect against even if your password is stolen?', options: [['A','It prevents the password from ever being guessed'],['B','It stops an attacker from logging in without your second factor'],['C','It automatically changes your password every day'],['D','It deletes your account after a breach']], correct: 'B' },
      { prompt: 'If someone claiming to be from IT asks for your 2FA one-time code over the phone, you should:', options: [['A','Read it out, since IT staff need it to help you'],['B','Refuse and report the request'],['C','Share it only if they know your name'],['D','Change your password afterwards but say nothing']], correct: 'B' },
      { prompt: "Your account has been temporarily locked after several failed login attempts. What does this mean?", options: [['A','This is a protective control and you should contact an admin if it wasn\'t you'],['B','Your account has been permanently disabled'],['C','You must create a brand-new account'],['D','Nothing — this happens randomly and can be ignored']], correct: 'A' },
    ]
  },
  {
    title: 'Phishing & Social Engineering Awareness',
    description: 'Recognising phishing warning signs and understanding why social engineering exploits trust and urgency.',
    estimated_minutes: 12,
    video_url: 'https://youtu.be/wD3etEPmfwg',
    lesson_content: `Phishing tries to trick you into revealing credentials, approving a fraudulent request, or installing malware, usually by impersonating someone you trust. Warning signs include an almost-right sender address, urgent or threatening language, unexpected attachments/links, and requests to bypass normal approval steps.

Attackers rely on psychology, not just technology: they create urgency so you act before you think. Hover over links to check the real destination, check the sender's actual address, and navigate to Weblook Shield directly via a bookmark rather than clicking email links. If a request seems unusual, verify it through a separate channel before acting.

Report suspicious messages through the incident reporting feature rather than simply deleting them. If you did click a link and entered your credentials, change your password immediately, report the incident, and let the security team check your account. Acting quickly and openly limits the damage.`,
    questions: [
      { prompt: 'Which of the following is a common warning sign of a phishing email?', options: [['A','A calm, unhurried tone with no links'],['B','Urgent language pressuring you to act immediately'],['C','It was sent during normal business hours'],['D','It includes the company logo']], correct: 'B' },
      { prompt: 'The safest way to log in to Weblook Shield after receiving a prompting email is to:', options: [['A','Click the link in the email'],['B','Forward the email to a colleague to click instead'],['C','Navigate to Weblook Shield directly using your own bookmark or typed URL'],['D','Reply to the email with your password for verification']], correct: 'C' },
      { prompt: 'Social engineering primarily exploits:', options: [['A','Software bugs in the operating system'],['B','Human trust, urgency, and authority'],['C','Weaknesses in network cabling'],['D','Outdated antivirus signatures only']], correct: 'B' },
      { prompt: 'You receive an unusual request that appears to come from a senior manager. What should you do?', options: [['A','Verify the request through a separate channel before acting'],['B','Comply immediately since it came from a manager'],['C','Ignore it and never respond'],['D','Forward your password to confirm your identity']], correct: 'A' },
      { prompt: 'You accidentally entered your password on a fake login page. What is the best next step?', options: [['A','Say nothing and hope it goes unnoticed'],['B','Wait a few days to see if anything happens'],['C','Immediately change your password and report the incident'],['D','Delete your Weblook Shield account']], correct: 'C' },
    ]
  },
  {
    title: 'Data Protection & Privacy Essentials',
    description: 'What data Weblook Shield holds, least privilege, and how to handle confidential data responsibly.',
    estimated_minutes: 10,
    video_url: 'https://youtu.be/GEu5Hf7OfNw',
    lesson_content: `Weblook Shield stores account information, role assignments, policy acknowledgements, quiz scores, activity logs, and asset-request records — for security governance only, never for performance reviews or general surveillance.

Individual-level data (your quiz scores, login history, compliance status) is restricted to administrators and your relevant department head, not visible company-wide. The System Owner has read-only access to aggregate data only. This mirrors the least-privilege principle: access the minimum data necessary to do your job.

Never export, screenshot, or share confidential data outside approved processes, and never use administrative access to look up colleagues out of curiosity. Data retention periods are documented; you can ask an administrator or department head what data is held about you and why.`,
    questions: [
      { prompt: 'What is the purpose of the employee data collected by Weblook Shield?', options: [['A','General employee surveillance'],['B','Security-governance purposes such as compliance and access management'],['C','Marketing analysis'],['D','Performance review scoring']], correct: 'B' },
      { prompt: 'The principle of "least privilege" means:', options: [['A','Everyone should have full access to make things easier'],['B','Only the System Owner may ever view any data'],['C','Access should be limited to the minimum needed to do one\'s job'],['D','Passwords should be as short as possible']], correct: 'C' },
      { prompt: "Who is generally able to view an individual employee's detailed compliance and quiz data?", options: [['A','Administrators and the relevant department head only'],['B','Any employee who asks'],['C','External vendors by default'],['D','Nobody, under any circumstance']], correct: 'A' },
      { prompt: 'Which of the following is an acceptable way to handle confidential Weblook Shield data?', options: [['A','Screenshot it and share it in a personal chat'],['B','Export it to a personal USB drive for convenience'],['C','Access and use it only through approved processes and for legitimate work purposes'],['D','Look up a colleague\'s record out of curiosity']], correct: 'C' },
      { prompt: 'If you want to know what personal data Weblook Shield holds about you, you should:', options: [['A','Assume you are not allowed to ask'],['B','Raise it with an administrator or your department head'],['C','Try to access the database directly'],['D','Ask a colleague to look it up for you']], correct: 'B' },
    ]
  },
  {
    title: 'Acceptable Use of Company IT Resources',
    description: 'What counts as acceptable use, personal accountability, and the device-naming requirement.',
    estimated_minutes: 9,
    video_url: 'https://youtu.be/4jE1KhNnJhQ',
    lesson_content: `The Acceptable Use Policy sets the ground rules for using Weblook's accounts, devices, network and software, so everyone shares an unambiguous understanding of what is and isn't permitted.

Every action taken under your account is attributed to you and logged. Never share credentials, leave sessions open on shared devices, or let someone else use your account "just this once." If your account may have been used without your knowledge, report it immediately.

Weblook Shield links the AUP directly to the live asset inventory, so you can see exactly which devices it covers and request an asset you're entitled to. Before connecting any device to Weblook's internal network, set its network device name to your own name (e.g. "Jane Perera - Laptop") — this helps administrators identify a device immediately during an investigation.

Policy violations are reviewed proportionately by administrators, from a reminder up to formal disciplinary action, depending on severity and intent.`,
    questions: [
      { prompt: 'Why does an Acceptable Use Policy exist?', options: [['A','To restrict employees for no operational reason'],['B','To create a shared, clear understanding of permitted use of IT resources'],['C','Only to satisfy auditors once a year'],['D','To replace the need for passwords']], correct: 'B' },
      { prompt: 'If you let a colleague briefly use your logged-in Weblook Shield session, you are:', options: [['A','Still responsible, because actions are logged under your account'],['B','Not responsible, since they did the action'],['C','Only responsible if something goes wrong'],['D','Automatically logged out, so it doesn\'t matter']], correct: 'A' },
      { prompt: 'In Weblook Shield, the Acceptable Use Policy for devices is linked to:', options: [['A','The live asset inventory'],['B','The employee\'s personal social media'],['C','An unrelated third-party website'],['D','Nothing — it stands alone']], correct: 'A' },
      { prompt: 'What should you do if you believe your account was used without your knowledge?', options: [['A','Say nothing and change nothing'],['B','Wait until your next performance review to mention it'],['C','Report it immediately'],['D','Delete the activity log yourself']], correct: 'C' },
      { prompt: 'Consequences for AUP violations are generally:', options: [['A','Identical regardless of severity or intent'],['B','Never enforced in practice'],['C','Proportionate to severity and intent, from retraining to disciplinary action'],['D','Decided by a vote of all employees']], correct: 'C' },
      { prompt: "Before connecting your device to Weblook's internal network, what must you do?", options: [['A','Nothing — any device name is fine'],['B','Set the device\'s network name to your own name'],['C','Disable your device\'s firewall'],['D','Register the device with a third-party vendor']], correct: 'B' },
    ]
  },
  {
    title: 'Remote Working Security',
    description: 'Additional risks of working outside the office, and how to secure your connection, device and workspace.',
    estimated_minutes: 10,
    video_url: 'https://youtu.be/TL4vXyM-Zps',
    lesson_content: `Outside the office you lose managed firewalls, monitored Wi-Fi and physical access control. Cafés, airports and shared home networks introduce new risks: unsecured Wi-Fi, shoulder-surfing, and personal devices that may not be patched to the same standard as company equipment.

Avoid accessing company systems over open public Wi-Fi without an encrypted connection. Keep your home router's firmware updated and change its default admin password. Weblook Shield enforces TLS for all traffic, but that protects data on the wire, not a device that's already compromised.

Lock your screen whenever you step away, even at home, and never let family members use a device logged into Weblook Shield. Remote work does not change your policy-acknowledgement or training obligations — reminders still apply. Report lost devices or suspected incidents immediately, regardless of location.`,
    questions: [
      { prompt: 'What protection does the office network typically provide that remote work lacks by default?', options: [['A','Managed firewalls and monitored, controlled network access'],['B','Faster typing speed'],['C','Free coffee'],['D','Automatic 2FA enrolment']], correct: 'A' },
      { prompt: 'Which practice best protects a device used for remote work?', options: [['A','Leaving it logged in and unlocked when stepping away'],['B','Locking the screen whenever you step away, even at home'],['C','Letting family members use it for convenience'],['D','Disabling automatic screen lock to save time']], correct: 'B' },
      { prompt: "TLS encryption on Weblook Shield's traffic protects:", options: [['A','Data while it travels over the network, not a compromised device'],['B','Your password from ever being guessed'],['C','Physical theft of your laptop'],['D','Nothing relevant to remote work']], correct: 'A' },
      { prompt: 'Does working remotely change your obligation to complete policy acknowledgements and training?', options: [['A','Yes, remote employees are exempt'],['B','Only if your manager remembers to remind you'],['C','Only during the first month of remote work'],['D','No, the same obligations and reminders still apply']], correct: 'D' },
      { prompt: 'If you lose a company device while working remotely, you should:', options: [['A','Buy a replacement yourself and say nothing'],['B','Report it immediately through the incident reporting workflow'],['C','Assume it\'s not a big deal since it was password protected'],['D','Wait until you\'re back in the office to mention it']], correct: 'B' },
    ]
  },
  {
    title: 'Incident Recognition & Reporting',
    description: 'What qualifies as an incident, and why fast, blame-free reporting improves outcomes.',
    estimated_minutes: 8,
    video_url: 'https://youtu.be/Ps2v2hQhC7U',
    lesson_content: `A security incident isn't only a major breach — it includes a suspicious email, a lost device, an unexpected password reset prompt, unfamiliar account activity, or sending sensitive information to the wrong person. If something feels "off," it's worth reporting.

The value of a report drops sharply with time — the faster the security team knows, the more options they have to contain it. Every authentication event and policy action is already logged to an append-only audit trail, so reports are corroborated by evidence.

Use the incident reporting feature to submit what happened, when, and any relevant details. You don't need to be certain something is malicious — the security team decides whether escalation is needed. Reporting in good faith, including your own mistake, is treated as a positive action, not an admission of fault.`,
    questions: [
      { prompt: 'Which of the following is worth reporting as a possible security incident?', options: [['A','Only confirmed data breaches'],['B','Only incidents involving senior management'],['C','Nothing — only IT should notice these things'],['D','Anything unusual, such as a suspicious email or unfamiliar login activity']], correct: 'D' },
      { prompt: 'Why does reporting speed matter for security incidents?', options: [['A','It doesn\'t — timing makes no difference'],['B','Faster reporting gives the security team more options to contain a problem'],['C','Late reports are always ignored automatically'],['D','Only annual reports are reviewed']], correct: 'B' },
      { prompt: 'Do you need to be certain something is malicious before reporting it?', options: [['A','Yes, unconfirmed issues should never be reported'],['B','No — the security team decides whether escalation is needed'],['C','Only administrators can determine this before reporting'],['D','Only if a manager tells you to report it']], correct: 'B' },
      { prompt: 'What supports an incident report within Weblook Shield?', options: [['A','Nothing — reports rely purely on memory'],['B','Manual paper records only'],['C','A public voting system'],['D','The append-only audit trail logging authentication and policy events']], correct: 'D' },
      { prompt: 'How is a good-faith incident report generally treated within the organisation?', options: [['A','As an admission of fault'],['B','As grounds for automatic disciplinary action'],['C','As a positive, responsible action'],['D','It is ignored unless repeated three times']], correct: 'C' },
    ]
  },
];

// A handful of sample assets so the Asset Inventory / Asset Request
// workflow (linked to WSP-01) has real data to demonstrate against.
const ASSETS = [
  { asset_tag: 'LAPTOP-0001', asset_type: 'Laptop', description: 'Dell Latitop 5440, 16GB RAM' },
  { asset_tag: 'LAPTOP-0002', asset_type: 'Laptop', description: 'Dell Latitude 5440, 16GB RAM' },
  { asset_tag: 'MOBILE-0001', asset_type: 'Mobile Phone', description: 'Company-issued Android device for MFA/on-call use' },
  { asset_tag: 'MFA-KEY-0001', asset_type: 'Security Key', description: 'Hardware security key for MFA backup' },
  { asset_tag: 'MONITOR-0001', asset_type: 'Monitor', description: '24-inch external monitor' },
];

async function seed() {
  const client = await pool.connect();
  try {
    console.log('Seeding Weblook Shield demo data...');

    // --- Users -------------------------------------------------------------
    for (const u of DEMO_USERS) {
      const hash = await bcrypt.hash(u.password, 12); // bcrypt cost 12 — balances security and login latency
      await client.query(
        `INSERT INTO users (full_name, email, password_hash, department, role_id, status)
         VALUES ($1, $2, $3, $4, $5, 'active')
         ON CONFLICT (email) DO NOTHING`,
        [u.full_name, u.email, hash, u.department, u.role_id]
      );
    }
    console.log(`  - ${DEMO_USERS.length} demo accounts ready (see README for credentials).`);

    // --- Policies + first version -------------------------------------------
    for (const p of POLICIES) {
      const existing = await client.query('SELECT id FROM policies WHERE code = $1', [p.code]);
      let policyId;
      if (existing.rows.length) {
        policyId = existing.rows[0].id;
      } else {
        const inserted = await client.query(
          `INSERT INTO policies (code, title, category, owner, is_device_policy) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
          [p.code, p.title, p.category, p.owner, p.is_device_policy]
        );
        policyId = inserted.rows[0].id;
      }
      const versionExists = await client.query('SELECT id FROM policy_versions WHERE policy_id = $1', [policyId]);
      if (!versionExists.rows.length) {
        await client.query(
          `INSERT INTO policy_versions (policy_id, version_label, content, is_current) VALUES ($1, '1.0', $2, TRUE)`,
          [policyId, p.content]
        );
      }
    }
    console.log(`  - ${POLICIES.length} policies (WSP-01..WSP-06) seeded with version 1.0.`);

    // --- Training modules + quiz questions ----------------------------------
    for (let i = 0; i < MODULES.length; i++) {
      const m = MODULES[i];
      const existing = await client.query('SELECT id FROM training_modules WHERE title = $1', [m.title]);
      let moduleId;
      if (existing.rows.length) {
        moduleId = existing.rows[0].id;
        // The module row itself already exists (e.g. from an earlier seed
        // run), but video_url is the one field editors realistically need
        // to change after the fact — as soon as the real YouTube links are
        // ready — without wanting to wipe and re-seed everything else
        // (quiz questions, progress, etc.). So this single column is kept
        // in sync on every seed run; nothing else about an existing module
        // is touched.
        await client.query(
          `UPDATE training_modules SET video_url = $1 WHERE id = $2`,
          [m.video_url || null, moduleId]
        );
      } else {
        const inserted = await client.query(
          `INSERT INTO training_modules (title, description, lesson_content, estimated_minutes, order_index, pass_mark_percent, video_url)
           VALUES ($1,$2,$3,$4,$5,60,$6) RETURNING id`,
          [m.title, m.description, m.lesson_content, m.estimated_minutes, i, m.video_url || null]
        );
        moduleId = inserted.rows[0].id;
        for (let q = 0; q < m.questions.length; q++) {
          const question = m.questions[q];
          const options = question.options.map(([key, text]) => ({ key, text }));
          await client.query(
            `INSERT INTO quiz_questions (module_id, prompt, options, correct_option, order_index)
             VALUES ($1,$2,$3,$4,$5)`,
            [moduleId, question.prompt, JSON.stringify(options), question.correct, q]
          );
        }
      }
    }
    console.log(`  - ${MODULES.length} training modules with quizzes seeded.`);

    // --- Assets --------------------------------------------------------------
    for (const a of ASSETS) {
      await client.query(
        `INSERT INTO assets (asset_tag, asset_type, description, status) VALUES ($1,$2,$3,'available')
         ON CONFLICT (asset_tag) DO NOTHING`,
        [a.asset_tag, a.asset_type, a.description]
      );
    }
    console.log(`  - ${ASSETS.length} sample assets seeded into the inventory.`);

    console.log('Seed complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
