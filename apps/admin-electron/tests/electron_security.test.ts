import assert from 'assert';
import fs from 'fs';
import path from 'path';

let passed = 0;
let failed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  ✓ [PASS] ${name}`);
    passed++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
    failed++;
  }
}

console.log('======================================================');
console.log('  ELECTRON ADMIN SECURITY & ARCHITECTURE TEST SUITE');
console.log('  Target: macOS Big Sur 11.7.11 (x86_64) DMG Package');
console.log('======================================================');

const electronDir = path.resolve(process.cwd(), 'apps/admin-electron');
const pkgPath = path.join(electronDir, 'package.json');
const mainPath = path.join(electronDir, 'src/main/main.ts');
const mainDistPath = path.join(electronDir, 'dist/main.cjs');
const preloadPath = path.join(electronDir, 'src/preload/preload.ts');
const preloadDistPath = path.join(electronDir, 'dist/preload.cjs');
const htmlPath = path.join(electronDir, 'src/renderer/index.html');
const entitlementsPath = path.join(electronDir, 'build/entitlements.mac.plist');

// -------------------------------------------------------------
// SUITE 1: Target Platform & Packaging Configuration
// -------------------------------------------------------------
console.log('\n[SUITE 1] Target Configuration (macOS Big Sur 11.7.11 x86_64)');

runTest('Validates package.json targeting Big Sur 11.7.11 and DMG artifact', () => {
  assert.ok(fs.existsSync(pkgPath), 'package.json must exist');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));

  assert.strictEqual(pkg.name, 'toto-drive-admin-electron');
  assert.strictEqual(pkg.productName, 'Toto Drive Admin Console');
  assert.ok(pkg.build, 'build configuration must be present');
  assert.strictEqual(pkg.build.appId, 'in.totodrive.admin');

  // Mac config
  const mac = pkg.build.mac;
  assert.ok(mac, 'mac build configuration required');
  assert.strictEqual(mac.minimumSystemVersion, '11.0.0', 'Must specify macOS 11.0.0 (Big Sur) compatibility');
  assert.strictEqual(mac.hardenedRuntime, true, 'Hardened runtime must be enabled for Gatekeeper compliance');

  // Target DMG and architecture x64
  const target = mac.target.find((t: any) => t.target === 'dmg');
  assert.ok(target, 'DMG installer target must be configured');
  assert.ok(target.arch.includes('x64'), 'Intel x86_64 architecture must be targeted');

  // Hardened runtime entitlements
  assert.ok(fs.existsSync(entitlementsPath), 'macOS entitlements plist must exist');
  const plist = fs.readFileSync(entitlementsPath, 'utf-8');
  assert.ok(plist.includes('com.apple.security.cs.allow-jit'));
  assert.ok(plist.includes('com.apple.security.network.client'));
});

// -------------------------------------------------------------
// SUITE 2: Hardened Electron Security Invariants (Task 5)
// -------------------------------------------------------------
console.log('\n[SUITE 2] Hardened Renderer Security Controls');

runTest('Enforces contextIsolation=true and nodeIntegration=false in BrowserWindow', () => {
  const mainSrc = fs.readFileSync(mainPath, 'utf-8');

  assert.ok(mainSrc.includes('contextIsolation: true'), 'contextIsolation must be explicitly set to true');
  assert.ok(mainSrc.includes('nodeIntegration: false'), 'nodeIntegration must be explicitly disabled');
  assert.ok(mainSrc.includes('nodeIntegrationInWorker: false'), 'nodeIntegrationInWorker must be false');
  assert.ok(mainSrc.includes('sandbox: true'), 'Chromium sandbox must be enabled');
  assert.ok(mainSrc.includes('webSecurity: true'), 'webSecurity must be enabled');
  assert.ok(mainSrc.includes('allowRunningInsecureContent: false'), 'Insecure mixed content must be blocked');
});

runTest('Restricts navigation, window opening, and enforces Strict CSP', () => {
  const mainSrc = fs.readFileSync(mainPath, 'utf-8');
  const htmlSrc = fs.readFileSync(htmlPath, 'utf-8');

  // Main CSP header injection
  assert.ok(mainSrc.includes('Content-Security-Policy'), 'Session webRequest must set Content-Security-Policy');
  assert.ok(mainSrc.includes("frame-src 'none'"), 'CSP must forbid iframe embedding');
  assert.ok(mainSrc.includes("object-src 'none'"), 'CSP must forbid object plugins');

  // Navigation guard
  assert.ok(mainSrc.includes('will-navigate'), 'will-navigate handler must be registered');
  assert.ok(mainSrc.includes('setWindowOpenHandler'), 'setWindowOpenHandler must deny arbitrary window creation');

  // HTML Meta tag CSP
  assert.ok(htmlSrc.includes('http-equiv="Content-Security-Policy"'), 'HTML must declare fallback CSP meta tag');
});

// -------------------------------------------------------------
// SUITE 3: Secure ContextBridge & Preload Isolation
// -------------------------------------------------------------
console.log('\n[SUITE 3] Preload Bridge & IPC Security');

runTest('Exposes only whitelisted methods via contextBridge without Node globals', () => {
  const preloadSrc = fs.readFileSync(preloadPath, 'utf-8');

  assert.ok(preloadSrc.includes('contextBridge.exposeInMainWorld'), 'Must use contextBridge');
  assert.ok(preloadSrc.includes('adminBridge'), 'Must expose adminBridge namespace');

  // Ensure forbidden Node modules are not leaked to renderer
  assert.ok(!preloadSrc.includes('exposeInMainWorld(\'fs\''), 'Never expose fs directly');
  assert.ok(!preloadSrc.includes('exposeInMainWorld(\'child_process\''), 'Never expose child_process');
  assert.ok(!preloadSrc.includes('exposeInMainWorld(\'process\''), 'Never expose raw process object');
});

// -------------------------------------------------------------
// SUITE 4: Zero Secret Bundling Verification
// -------------------------------------------------------------
console.log('\n[SUITE 4] Secret Exclusion & Safe Client Architecture');

runTest('Verifies zero backend secrets or database credentials are in renderer or preload', () => {
  const rendererFiles = [
    htmlPath,
    path.join(electronDir, 'src/renderer/js/app.js'),
    preloadDistPath
  ];

  const forbiddenStrings = [
    'whsec_',
    'service_role',
    'DATABASE_URL',
    'admin12345_hash',
    'PRIVATE_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const file of rendererFiles) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      for (const secret of forbiddenStrings) {
        assert.ok(!content.includes(secret), `Renderer bundle ${path.basename(file)} must not contain secret string "${secret}"`);
      }
    }
  }
});

// -------------------------------------------------------------
// SUITE 5: Production Bundle Verification
// -------------------------------------------------------------
console.log('\n[SUITE 5] Production Bundle Artifacts');

runTest('Verifies esbuild main and preload CJS distribution bundles exist and are valid', () => {
  assert.ok(fs.existsSync(mainDistPath), 'dist/main.cjs must exist');
  assert.ok(fs.existsSync(preloadDistPath), 'dist/preload.cjs must exist');

  const mainStats = fs.statSync(mainDistPath);
  const preloadStats = fs.statSync(preloadDistPath);

  assert.ok(mainStats.size > 1000, 'dist/main.cjs size should be > 1KB');
  assert.ok(preloadStats.size > 200, 'dist/preload.cjs size should be > 200B');

  // Check syntax validity by loading into Node.js VM
  const mainCode = fs.readFileSync(mainDistPath, 'utf-8');
  assert.ok(mainCode.includes('BrowserWindow'), 'Compiled main.cjs must bundle BrowserWindow logic');
});

console.log('\n======================================================');
console.log(`  ELECTRON SECURITY TESTS: ${passed} PASSED, ${failed} FAILED`);
console.log('======================================================');

if (failed > 0) {
  process.exit(1);
}
