# AXP Hub Error Audit (Automated + Static)

Date: 2026-04-15 (UTC)

## Scope & method
- Ran full test suite (`npm test --silent`).
- Ran lint (`npm run lint --silent`).
- Ran quality gate (`npm run quality:check --silent`).
- Did a web discovery search for "xp arena sensitivity tool"; no clearly attributable production URL was found.

## Confirmed issues

### UI / Template / Front-end integration
1. `public/result.html` still includes html2canvas CDN dependency, violating contract and quality guard.
   - Fails `tests/result_template.test.js` and `quality:check`.

2. `public/index.html` no longer includes legacy `id="vaultInput"` element expected by contract tests.
   - Fails `tests/profile_pages_contract.test.js`.

3. `public/app.js` has a syntax error (`Unexpected token )` at lint line 123).
   - Breaks parse-level JS integrity.

4. `public/nexus-auth.js` has a syntax error (`Unexpected token =` at lint line 6).
   - Potentially breaks auth bootstrapping in browsers.

5. `public/result.js` has a syntax error (`Unexpected token async` at lint line 287).
   - Can block result page interactive logic.

### Logic / Auth / API behavior regressions
6. Feedback flow behavior mismatch:
   - `POST /api/vault/feedback` returned `200`, but test expects `404` with `XP_AUTH_INVALID` in invalid-session scenario.
   - Fails `tests/feedback.test.js`.

7. Vendor insights endpoint unauthorized for expected authenticated flow.
   - `GET /api/vault/insights` returned `401` where test expects `200`.
   - Fails `tests/vendor_insights.test.js`.

8. Vendor generation endpoints unauthorized for expected flow.
   - Auto-generation + manual generation both returned `401` where tests expect `200`.
   - Fails `tests/vendor_generation.test.js`.

9. Admin uplink access key prefix mismatch.
   - Endpoint returns key format `AXP-CREATOR-ONE-...` while test expects `XP-CREATOR-ONE-...`.
   - Fails `tests/admin_uplink.test.js`.

### Quality / Reliability / Config
10. Runtime warning indicates incomplete DB env config in tests:
   - Missing `DB_HOST`, `DB_USER`, `DB_NAME`.
   - Shown during `tests/api.test.js`; while suite passes, this is an operational risk for deploy parity.

## Summary by category
- UI/templates: 2 confirmed regressions.
- JavaScript/function syntax: 3 parse errors.
- API/auth/logic: 4 behavior regressions.
- DB/config risk: 1 warning-level issue.

Total confirmed issues surfaced by automated checks: **10**.
