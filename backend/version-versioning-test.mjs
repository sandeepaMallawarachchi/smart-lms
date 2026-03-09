/**
 * version-versioning-test.mjs
 * ─────────────────────────────────────────────────────────
 * End-to-end test for version creation during resubmission.
 * Run with:  node backend/version-versioning-test.mjs
 *
 * Prerequisites: services running on ports 8081 (submission) and 8082 (version)
 *
 * Tests:
 *  1. Create a submission  (POST /api/submissions)
 *  2. Submit it            (POST /api/submissions/{id}/submit)
 *  3. Create text snapshot (POST /api/versions/text-snapshot)
 *  4. Check versions list  (GET  /api/versions/submission/{id}) → expect 1 version
 *  5. Submit again         (POST /api/submissions/{id}/submit) [resubmission]
 *  6. Create 2nd snapshot  (POST /api/versions/text-snapshot)
 *  7. Check versions list  (GET  /api/versions/submission/{id}) → expect 2 versions
 */

const SUBMISSION_API = 'http://localhost:8081';
const VERSION_API    = 'http://localhost:8082';

let passCount = 0;
let failCount = 0;

function pass(name, detail = '') {
    passCount++;
    console.log(`  ✓ PASS  ${name}${detail ? ' — ' + detail : ''}`);
}

function fail(name, detail = '') {
    failCount++;
    console.error(`  ✗ FAIL  ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(method, url, body) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const text = await res.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, json, text };
}

// ─── Helpers ──────────────────────────────────────────────

function unwrap(json) {
    // Backend wraps in { data: ... }
    if (json && typeof json === 'object' && 'data' in json) return json.data;
    return json;
}

function makeSnapshot(submissionId, studentId, versionLabel) {
    return {
        submissionId: Number(submissionId),
        studentId,
        commitMessage: `Assignment — ${versionLabel}`,
        totalWordCount: 120 + Math.floor(Math.random() * 80),
        overallGrade: 7.5,
        maxGrade: 10.0,
        answers: [
            {
                questionId: 'q1',
                questionText: 'Describe OOP principles',
                answerText: 'Object-Oriented Programming uses four key principles: encapsulation, inheritance, polymorphism, and abstraction.',
                wordCount: 18,
                grammarScore: 8.0,
                clarityScore: 7.5,
                completenessScore: 8.0,
                relevanceScore: 9.0,
                projectedGrade: 7.5,
                maxPoints: 10.0,
            }
        ],
    };
}

// ─── Test runner ──────────────────────────────────────────

async function run() {
    console.log('\n════════════════════════════════════════');
    console.log('  Version Versioning End-to-End Tests');
    console.log('════════════════════════════════════════\n');

    // ── Check services are reachable ──────────────────────
    console.log('── Checking service availability ──');
    let submissionOk = false;
    let versionOk    = false;
    try {
        const r = await req('GET', `${SUBMISSION_API}/api/submissions`);
        submissionOk = r.status < 500;
        pass('Submission service reachable', `HTTP ${r.status}`);
    } catch (e) {
        fail('Submission service reachable', e.message);
    }
    try {
        const r = await req('GET', `${VERSION_API}/api/versions/submission/0`);
        versionOk = r.status < 500;
        pass('Version service reachable', `HTTP ${r.status}`);
    } catch (e) {
        fail('Version service reachable', e.message);
    }

    if (!submissionOk || !versionOk) {
        console.log('\n⚠ Services not running — skipping API tests.\n');
        console.log('  Start both services and re-run this script.\n');
        return;
    }

    // ── Create a fresh submission ─────────────────────────
    console.log('\n── Test: Create submission ──');
    const studentId    = 'test-student-' + Date.now();
    const assignmentId = 'test-assignment-' + Date.now();

    const createRes = await req('POST', `${SUBMISSION_API}/api/submissions`, {
        studentId,
        studentName: 'Test Student',
        assignmentId,
        title: 'Versioning Test',
        submissionType: 'ASSIGNMENT',
    });

    const submission = unwrap(createRes.json);
    const submissionId = submission?.id;

    if (submissionId) {
        pass('Create submission', `id=${submissionId}, status=${submission?.status}`);
    } else {
        fail('Create submission', `HTTP ${createRes.status}: ${createRes.text}`);
        return;
    }

    // ── Save an answer (required before submit) ───────────
    console.log('\n── Test: Save answer (required before submit) ──');
    const saveAnswerRes = await req('PUT',
        `${SUBMISSION_API}/api/submissions/${submissionId}/answers/q1`,
        {
            questionText: 'What is OOP?',
            answerText: 'Object-Oriented Programming uses encapsulation, inheritance, polymorphism, and abstraction.',
            wordCount: 15,
            characterCount: 95,
        }
    );
    if (saveAnswerRes.status < 300) {
        pass('Save answer before first submit');
    } else {
        fail('Save answer', `HTTP ${saveAnswerRes.status}: ${saveAnswerRes.text}`);
    }

    // ── First submit ──────────────────────────────────────
    console.log('\n── Test: First submit ──');
    const submit1Res = await req('POST', `${SUBMISSION_API}/api/submissions/${submissionId}/submit`);
    const submitted1 = unwrap(submit1Res.json);

    if (submit1Res.status < 300) {
        pass('First submitSubmission', `status=${submitted1?.status}, versionNumber=${submitted1?.versionNumber}, totalVersions=${submitted1?.totalVersions}`);
        if (submitted1?.totalVersions !== 1) {
            fail('  totalVersions after first submit should be 1', `got ${submitted1?.totalVersions}`);
        } else {
            pass('  totalVersions=1 after first submit');
        }
    } else {
        fail('First submitSubmission', `HTTP ${submit1Res.status}: ${submit1Res.text}`);
        return;
    }

    // ── Create first text snapshot ────────────────────────
    console.log('\n── Test: Create first text snapshot ──');
    const snap1Res = await req('POST', `${VERSION_API}/api/versions/text-snapshot`,
        makeSnapshot(submissionId, studentId, 'v1'));
    const snap1 = unwrap(snap1Res.json);

    if (snap1Res.status < 300) {
        pass('Create first text snapshot', `versionNumber=${snap1?.versionNumber}, id=${snap1?.id}`);
        if (snap1?.versionNumber !== 1) {
            fail('  First snapshot versionNumber should be 1', `got ${snap1?.versionNumber}`);
        } else {
            pass('  First snapshot versionNumber=1 ✓');
        }
    } else {
        fail('Create first text snapshot', `HTTP ${snap1Res.status}: ${snap1Res.text}`);
        return;
    }

    // ── GET versions — expect 1 ───────────────────────────
    console.log('\n── Test: Get versions after first submit ──');
    const versions1Res = await req('GET', `${VERSION_API}/api/versions/submission/${submissionId}`);
    const versions1 = unwrap(versions1Res.json);
    const v1Count = Array.isArray(versions1) ? versions1.length : 0;

    if (versions1Res.status < 300) {
        pass('Get versions after first submit', `count=${v1Count}`);
        if (v1Count === 1) {
            pass('  Exactly 1 version exists ✓');
        } else {
            fail(`  Expected 1 version, got ${v1Count}`);
        }
    } else {
        fail('Get versions after first submit', `HTTP ${versions1Res.status}: ${versions1Res.text}`);
    }

    // ── Second submit (resubmission) ──────────────────────
    console.log('\n── Test: Second submit (resubmission) ──');
    const submit2Res = await req('POST', `${SUBMISSION_API}/api/submissions/${submissionId}/submit`);
    const submitted2 = unwrap(submit2Res.json);

    if (submit2Res.status < 300) {
        pass('Second submitSubmission', `status=${submitted2?.status}, versionNumber=${submitted2?.versionNumber}, totalVersions=${submitted2?.totalVersions}`);
        if (submitted2?.totalVersions !== 2) {
            fail('  totalVersions after second submit should be 2', `got ${submitted2?.totalVersions}`);
        } else {
            pass('  totalVersions=2 after second submit ✓');
        }
    } else {
        fail('Second submitSubmission (resubmission)', `HTTP ${submit2Res.status}: ${submit2Res.text}`);
        console.error('  ↳ Root cause found: submitSubmission() blocks resubmission!');
        console.error('  ↳ Response body:', submit2Res.text);
        return;
    }

    // ── Create second text snapshot ───────────────────────
    console.log('\n── Test: Create second text snapshot ──');
    const snap2Res = await req('POST', `${VERSION_API}/api/versions/text-snapshot`,
        makeSnapshot(submissionId, studentId, 'v2'));
    const snap2 = unwrap(snap2Res.json);

    if (snap2Res.status < 300) {
        pass('Create second text snapshot', `versionNumber=${snap2?.versionNumber}, id=${snap2?.id}`);
        if (snap2?.versionNumber !== 2) {
            fail('  Second snapshot versionNumber should be 2', `got ${snap2?.versionNumber}`);
        } else {
            pass('  Second snapshot versionNumber=2 ✓');
        }
        if (snap2?.id === snap1?.id) {
            fail('  Second snapshot has same ID as first — was it overwritten?!');
        } else {
            pass('  Second snapshot has a different ID ✓');
        }
    } else {
        fail('Create second text snapshot', `HTTP ${snap2Res.status}: ${snap2Res.text}`);
        console.error('  ↳ Root cause found: createTextSnapshot() fails on second call!');
        console.error('  ↳ This is why only one version is displayed.');
        return;
    }

    // ── GET versions — expect 2 ───────────────────────────
    console.log('\n── Test: Get versions after second submit ──');
    const versions2Res = await req('GET', `${VERSION_API}/api/versions/submission/${submissionId}`);
    const versions2 = unwrap(versions2Res.json);
    const v2Count = Array.isArray(versions2) ? versions2.length : 0;

    if (versions2Res.status < 300) {
        pass('Get versions after second submit', `count=${v2Count}`);
        if (v2Count === 2) {
            pass('  Exactly 2 versions exist ✓');
            // Print versions for manual inspection
            if (Array.isArray(versions2)) {
                versions2.forEach(v => {
                    console.log(`    v${v.versionNumber} — id=${v.id}, commitMessage="${v.commitMessage}"`);
                });
            }
        } else {
            fail(`  Expected 2 versions, got ${v2Count} — THIS IS THE BUG`);
            console.error('  ↳ Only one version is stored even after two submits.');
        }
    } else {
        fail('Get versions after second submit', `HTTP ${versions2Res.status}: ${versions2Res.text}`);
    }

    // ── Frontend response unwrapping check ────────────────
    console.log('\n── Test: Frontend response unwrapping ──');
    const rawRes = await req('GET', `${VERSION_API}/api/versions/submission/${submissionId}`);
    const rawBody = rawRes.json;

    // Simulate how useVersions.ts's versionService.getVersions() unwraps the response:
    function frontendUnwrap(raw) {
        if (raw && typeof raw === 'object') {
            if ('data' in raw) return raw.data;
        }
        return raw;
    }
    const unwrapped = frontendUnwrap(rawBody);
    const isArray = Array.isArray(unwrapped);

    console.log(`    Raw response keys: ${Object.keys(rawBody || {}).join(', ')}`);
    console.log(`    After unwrap: isArray=${isArray}, length=${isArray ? unwrapped.length : 'N/A'}`);

    if (isArray && unwrapped.length === 2) {
        pass('Frontend unwrapping returns 2 versions');
    } else if (isArray && unwrapped.length === 1) {
        fail('Frontend unwrapping only sees 1 version', 'DB has 2 but API returns 1?');
    } else if (!isArray) {
        fail('Frontend unwrapping: response is not an array', `type=${typeof unwrapped}`);
    } else {
        fail('Frontend unwrapping: unexpected result', `length=${unwrapped?.length}`);
    }

    // ── Summary ───────────────────────────────────────────
    console.log('\n════════════════════════════════════════');
    console.log(`  Results: ${passCount} passed, ${failCount} failed`);
    console.log('════════════════════════════════════════\n');

    if (failCount === 0) {
        console.log('✓ All tests passed — version creation is working correctly.\n');
        console.log('  If the UI still shows only one version, the issue may be:');
        console.log('  - The frontend fire-and-forget snapshot call is getting aborted on navigation');
        console.log('  - The version history page is passing the wrong submissionId');
        console.log('  - There is a CORS issue preventing the snapshot call from completing\n');
    } else {
        console.log('✗ Some tests failed — see diagnostics above for the root cause.\n');
    }
}

run().catch(e => {
    console.error('Test runner error:', e);
    process.exit(1);
});
