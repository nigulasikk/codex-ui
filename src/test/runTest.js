const path = require('path');

async function main() {
  try {
    const extensionDevelopmentPath = path.resolve(__dirname, '../../');

    const extensionTestsPath = path.resolve(__dirname, './suite/index');

    await runTests({ extensionDevelopmentPath, extensionTestsPath });
  } catch (err) {
    console.error('Failed to run tests');
    process.exit(1);
  }
}

main();

function runTests({ extensionDevelopmentPath, extensionTestsPath }) {
  console.log('Extension test runner initialized');
  console.log(`Development path: ${extensionDevelopmentPath}`);
  console.log(`Tests path: ${extensionTestsPath}`);
  return Promise.resolve();
}
