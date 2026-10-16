/**
 * [Space_consult_assist] Vercel 구버전 배포본 자동 퍼지 스크립트
 * - 현재 Production(Alias 연결본)을 100% 보호하면서(--safe), 누적된 과거 배포본을 일괄 삭제합니다.
 * - 실행:
 *   node scripts/auto_purge_vercel.cjs              (즉시 퍼지)
 *   node scripts/auto_purge_vercel.cjs --with-delay (즉시 퍼지 + 65초 후 신규 배포 승격 완료 시점 재퍼지)
 */
const { execSync, spawn } = require('child_process');
const path = require('path');

const PROJECT_NAME = 'space-consult-assist';
const FRONTEND_DIR = path.resolve(__dirname, '..', 'frontend');

function runSafePurge() {
  console.log(`🚀 [${PROJECT_NAME}] Vercel 구버전 배포본 자동 퍼지 시작...`);
  try {
    const cmd = process.platform === 'win32'
      ? `npx.cmd vercel rm ${PROJECT_NAME} --safe --yes`
      : `npx vercel rm ${PROJECT_NAME} --safe --yes`;

    const out = execSync(cmd, {
      cwd: FRONTEND_DIR,
      stdio: 'pipe',
      encoding: 'utf8',
    });
    if (out) process.stdout.write(out);
    console.log(`✅ [${PROJECT_NAME}] Vercel 구버전 자동 퍼지 완료 (현재 Production 배포본 유지)`);
  } catch (err) {
    const stderr = (err.stderr || err.message || '').toString();
    if (
      stderr.includes('Could not find unaliased deployments') ||
      stderr.includes('No deployments') ||
      stderr.includes('not found') ||
      stderr.includes('0 deployments') ||
      stderr.includes('No safe deployments')
    ) {
      console.log(`✨ [${PROJECT_NAME}] 정리할 구버전 배포본이 없습니다. (최신 Production 1개만 유지 중)`);
      return;
    }
    console.warn(`⚠️ [${PROJECT_NAME}] 퍼지 알림: ${stderr.trim()}`);
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--delayed-worker')) {
    setTimeout(() => {
      runSafePurge();
      process.exit(0);
    }, 65000);
    return;
  }

  runSafePurge();

  if (args.includes('--with-delay')) {
    const child = spawn(process.execPath, [__filename, '--delayed-worker'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();
    console.log(`⏱️ [${PROJECT_NAME}] 신규 푸시 배포 완료(65초 후) 시점 자동 정리 예약됨.`);
  }
}

main();
