const {writeFileSync} = require('fs');
const path = require('path');

const copyPackgeFile = () => {
  const packageJson = require('./package.json');
  delete packageJson.private;
  const tsconfig = require('./tsconfig.json');
  writeFileSync(
    path.join(tsconfig.compilerOptions.outDir, 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
};

copyPackgeFile();