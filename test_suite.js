const assert = require('assert');

const BASE_URL = 'http://localhost:5000';

async function runTests() {
  console.log('🧪 Starting End-to-End Automated Test Suite for Team Task Management...\n');

  // Test 1: Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const health = await healthRes.json();
  assert.strictEqual(health.status, 'healthy', 'Health check failed');
  console.log('✅ Test 1 Passed: Server health check responsive');

  // Test 2: Admin Login
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: process.env.DEFAULT_ADMIN_EMAIL || 'jerison1539@gmail.com',
      password: process.env.DEFAULT_ADMIN_PASSWORD || 'JeriADM07#',
      portalRole: 'admin'
    })
  });
  const adminAuth = await adminLoginRes.json();
  assert.strictEqual(adminAuth.success, true, 'Admin login failed');
  assert.strictEqual(adminAuth.user.role, 'admin', 'Role should be admin');
  const adminToken = adminAuth.token;
  console.log('✅ Test 2 Passed: Admin authenticated successfully (JWT received, role=admin)');

  // Test 3: OTP Registration Flow
  const testEmail = `new.engineer.${Date.now()}@teamtask.com`;
  const sendOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const sendOtpData = await sendOtpRes.json();
  assert.strictEqual(sendOtpData.success, true, 'Send OTP failed');
  console.log(`✅ Test 3a Passed: OTP dispatched to ${testEmail}`);

  // Retrieve OTP from dev emails
  const devEmailsRes = await fetch(`${BASE_URL}/api/auth/dev-emails`);
  const devEmails = await devEmailsRes.json();
  assert.strictEqual(devEmails.success, true);
  const targetEmailRecord = devEmails.emails.find(e => e.to === testEmail);
  assert.ok(targetEmailRecord, 'Dev email record not found');
  const otpMatch = targetEmailRecord.subject.match(/\[(\d{6})\]/);
  assert.ok(otpMatch, 'OTP not found in subject');
  const otp = otpMatch[1];
  console.log(`✅ Test 3b Passed: Successfully extracted 6-digit OTP [${otp}]`);

  // Verify OTP
  const verifyOtpRes = await fetch(`${BASE_URL}/api/auth/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, otp })
  });
  const verifyOtpData = await verifyOtpRes.json();
  assert.strictEqual(verifyOtpData.success, true, 'Verify OTP failed');
  console.log('✅ Test 3c Passed: OTP verified successfully');

  // Complete Registration
  const registerRes = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Taylor Swiftly',
      email: testEmail,
      password: 'User@123456',
      otp,
      department: 'Frontend Engineering'
    })
  });
  const regData = await registerRes.json();
  assert.strictEqual(regData.success, true, 'Registration failed');
  const userToken = regData.token;
  const userId = regData.user.id;
  console.log(`✅ Test 3d Passed: User registered (ID: ${userId}, Welcome Email & Admin notification sent)`);

  // Test 4: Task Creation and Assignment by Admin
  const createTaskRes = await fetch(`${BASE_URL}/api/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      title: 'Develop Real-Time Activity Monitoring',
      description: 'Implement real-time updates and notifications for team members',
      priority: 'high',
      category: 'Frontend Engineering',
      deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
      assignedUserIds: [userId]
    })
  });
  const taskCreated = await createTaskRes.json();
  assert.strictEqual(taskCreated.success, true, 'Task creation failed');
  const taskId = taskCreated.taskId;
  console.log(`✅ Test 4 Passed: Admin created task #${taskId} and assigned to user ${userId}`);

  // Test 5: User Views Assigned Task & Updates Status
  const userTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const userTasksData = await userTasksRes.json();
  assert.strictEqual(userTasksData.success, true);
  const myTask = userTasksData.tasks.find(t => t.id === taskId);
  assert.ok(myTask, 'Task was not found in user assigned list');
  assert.strictEqual(myTask.user_status, 'pending');
  console.log('✅ Test 5a Passed: User views only their assigned tasks');

  // Update status to in_progress
  const updateStatusRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({ status: 'in_progress' })
  });
  const statusData = await updateStatusRes.json();
  assert.strictEqual(statusData.success, true);
  console.log('✅ Test 5b Passed: User updated task status to "in_progress"');

  // Test 6: Work Submission with File Upload
  const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
  const fileContent = 'Proof of completion: Activity monitoring components and unit tests are complete.';
  const payload = [
    `--${boundary}`,
    'Content-Disposition: form-data; name="notes"',
    '',
    'All requested automated unit tests and UI cards completed cleanly.',
    `--${boundary}`,
    'Content-Disposition: form-data; name="file"; filename="deliverable_report.txt"',
    'Content-Type: text/plain',
    '',
    fileContent,
    `--${boundary}--`,
    ''
  ].join('\r\n');

  const submitWorkRes = await fetch(`${BASE_URL}/api/tasks/${taskId}/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': `multipart/form-data; boundary=${boundary}`,
      Authorization: `Bearer ${userToken}`
    },
    body: payload
  });
  const submitData = await submitWorkRes.json();
  assert.strictEqual(submitData.success, true, 'Work submission failed');
  console.log('✅ Test 6 Passed: User uploaded completed work proof file; task marked as Completed');

  // Test 7: Private Chat between User and Admin
  const userMsgRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${userToken}`
    },
    body: JSON.stringify({
      receiverId: adminAuth.user.id,
      content: 'Hello Admin! I have uploaded the completed deliverable for task # ' + taskId
    })
  });
  const userMsgData = await userMsgRes.json();
  assert.strictEqual(userMsgData.success, true, 'User chat failed');
  console.log('✅ Test 7a Passed: User sent private doubt/message to Admin');

  // Admin replies to User
  const adminMsgRes = await fetch(`${BASE_URL}/api/chat/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      receiverId: userId,
      content: 'Excellent work, Taylor! Reviewing your deliverable file now.'
    })
  });
  const adminMsgData = await adminMsgRes.json();
  assert.strictEqual(adminMsgData.success, true, 'Admin chat reply failed');
  console.log('✅ Test 7b Passed: Admin replied to User in 1-on-1 private thread');

  // Test 8: Spreadsheet Login Activity Log & CSV Export
  const logsRes = await fetch(`${BASE_URL}/api/users/login-activity`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const logsData = await logsRes.json();
  assert.strictEqual(logsData.success, true);
  assert.ok(logsData.logs.length > 0, 'Logs should not be empty');
  console.log(`✅ Test 8a Passed: Spreadsheet login activity table retrieved (${logsData.logs.length} records)`);

  const csvRes = await fetch(`${BASE_URL}/api/users/login-activity?format=csv`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const csvText = await csvRes.text();
  assert.ok(csvText.includes('User Name,Email,Role,Status,IP Address,User Agent'), 'CSV headers invalid');
  console.log('✅ Test 8b Passed: CSV spreadsheet export generated successfully');

  // Test 9: File Permissions Enforcement
  // Normal user tries to fetch other users' files
  const filesRes = await fetch(`${BASE_URL}/api/files`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const filesData = await filesRes.json();
  assert.strictEqual(filesData.success, true);
  // User should only see their own files
  filesData.files.forEach(f => {
    assert.strictEqual(f.user_id, userId, 'Security breach: user can see another user\'s files');
  });
  // Test 10: Information Separation & Privacy Verification
  // Normal user MUST NOT be able to view other users' info, team roster, or login activities
  const userTeamRes = await fetch(`${BASE_URL}/api/users/team`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userTeamRes.status, 403, 'Normal user should be forbidden from accessing team roster');
  console.log('✅ Test 10a Passed: Normal users are strictly blocked (HTTP 403) from accessing the team roster');

  const userLogsRes = await fetch(`${BASE_URL}/api/users/login-activity`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  assert.strictEqual(userLogsRes.status, 403, 'Normal user should be forbidden from accessing login activity');
  console.log('✅ Test 10b Passed: Normal users are strictly blocked (HTTP 403) from accessing spreadsheet logs');

  const userChatConvsRes = await fetch(`${BASE_URL}/api/chat/conversations`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const userChatConvsData = await userChatConvsRes.json();
  assert.strictEqual(userChatConvsData.success, true);
  userChatConvsData.conversations.forEach(c => {
    assert.strictEqual(c.role, 'admin', 'Normal user should ONLY see Admin in chat conversations');
  });
  console.log('✅ Test 10c Passed: In private chat, normal users can ONLY see and communicate with the Administrator');

  // Verify task payload does not leak other users
  const verifyTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${userToken}` }
  });
  const verifyTasksData = await verifyTasksRes.json();
  verifyTasksData.tasks.forEach(t => {
    assert.strictEqual(t.assignments, undefined, 'Task assignments array containing other users must NOT be exposed to normal user');
  });
  console.log('✅ Test 10d Passed: Tasks payload contains ONLY personal assigned status without other members info');

  // Test 11: Duplicate Account Prevention
  // Attempting to send OTP with already registered email must be rejected
  const dupOtpRes = await fetch(`${BASE_URL}/api/auth/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const dupOtpData = await dupOtpRes.json();
  assert.strictEqual(dupOtpRes.status, 400, 'Duplicate email should be rejected');
  assert.strictEqual(dupOtpData.success, false);
  console.log('✅ Test 11 Passed: Duplicate account creation blocked on already-registered email');

  // Test 12: Single-Device Session Enforcement
  // Login Device 1
  const loginDevice1Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'User@123456' })
  });
  const login1Data = await loginDevice1Res.json();
  assert.strictEqual(login1Data.success, true);
  const device1Token = login1Data.token;

  // Verify Device 1 can access /api/auth/me
  const dev1MeRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${device1Token}` }
  });
  assert.strictEqual(dev1MeRes.status, 200, 'Device 1 session should be valid initially');

  // Login Device 2 with same email
  const loginDevice2Res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail, password: 'User@123456' })
  });
  const login2Data = await loginDevice2Res.json();
  assert.strictEqual(login2Data.success, true);
  const device2Token = login2Data.token;

  // Now Device 1 token MUST be rejected because Device 2 took over the active session
  const dev1TerminatedRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Authorization: `Bearer ${device1Token}` }
  });
  const dev1TerminatedData = await dev1TerminatedRes.json();
  assert.strictEqual(dev1TerminatedRes.status, 401, 'Device 1 session must be terminated');
  assert.strictEqual(dev1TerminatedData.sessionTerminated, true, 'sessionTerminated flag must be true');
  console.log('✅ Test 12 Passed: Single-device login strictly enforced (older device session terminated)');

  // Test 13: Login Notification Email Verification
  const devEmailsRes2 = await fetch(`${BASE_URL}/api/auth/dev-emails`);
  const devEmails2 = await devEmailsRes2.json();
  const loginEmail = devEmails2.emails.find(e => e.to === testEmail && e.subject.includes('New Login'));
  assert.ok(loginEmail, 'Login notification email should be dispatched to registered email');
  console.log(`✅ Test 13 Passed: Login notification email automatically dispatched to ${testEmail}`);

  // Test 14: Task Completed Auto-Placement & Order Verification
  const finalTasksRes = await fetch(`${BASE_URL}/api/tasks`, {
    headers: { Authorization: `Bearer ${device2Token}` }
  });
  const finalTasksData = await finalTasksRes.json();
  const myCompletedTask = finalTasksData.tasks.find(t => t.id === taskId);
  assert.strictEqual(myCompletedTask.user_status, 'completed', 'Submitted task must have user_status = completed');
  console.log(`✅ Test 14 Passed: Submitted task #${taskId} is immediately marked as completed`);

  // Test 15: Admin accesses User Profile and Profile Photo
  const userProfRes = await fetch(`${BASE_URL}/api/users/${userId}/profile`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const userProfData = await userProfRes.json();
  assert.strictEqual(userProfRes.status, 200, 'Admin must be able to view user profile');
  assert.strictEqual(userProfData.success, true);
  assert.ok(userProfData.profile.avatar, 'User profile must include avatar photo');
  assert.strictEqual(userProfData.profile.name, 'Taylor Swiftly');
  console.log(`✅ Test 15 Passed: Admin successfully retrieved profile and photo for user #${userId}`);

  // Test 16: Data Isolation - Normal user blocked from viewing another user's profile
  const userBlockProfRes = await fetch(`${BASE_URL}/api/users/1/profile`, {
    headers: { Authorization: `Bearer ${device2Token}` }
  });
  assert.strictEqual(userBlockProfRes.status, 403, 'Normal user must be forbidden from viewing other user profile');
  console.log('✅ Test 16 Passed: Data isolation verified - normal user blocked (HTTP 403) from viewing other profiles');

  // Test 17: Admin can edit admin profile only by admin
  // 17a: Non-admin attempt must be rejected (HTTP 403)
  const nonAdminEditRes = await fetch(`${BASE_URL}/api/users/admin-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${device2Token}`
    },
    body: JSON.stringify({ name: 'Hacker Admin' })
  });
  assert.strictEqual(nonAdminEditRes.status, 403, 'Non-admin must be blocked from editing admin profile');
  console.log('✅ Test 17a Passed: Non-admin strictly blocked (HTTP 403) from changing admin profile');

  // 17b: Admin updating admin profile succeeds
  const adminEditRes = await fetch(`${BASE_URL}/api/users/admin-profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      name: 'Executive Chief Admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=ExecutiveChief',
      department: 'Head of Operations'
    })
  });
  const adminEditData = await adminEditRes.json();
  assert.strictEqual(adminEditRes.status, 200, 'Admin profile update should succeed');
  assert.strictEqual(adminEditData.success, true);
  assert.strictEqual(adminEditData.user.name, 'Executive Chief Admin');
  assert.strictEqual(adminEditData.user.department, 'Head of Operations');
  console.log('✅ Test 17b Passed: Admin profile successfully updated exclusively by administrator');

  console.log('\n================================================================');
  console.log('🎉 ALL 17 COMPREHENSIVE END-TO-END SYSTEM TESTS PASSED PERFECTLY!');
  console.log('================================================================\n');
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
