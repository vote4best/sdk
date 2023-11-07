const { writeFileSync } = require("fs");
const path = require("path");
const stage = process.argv[2];
const copyPackgeFile = () => {
  const packageJson = require("./package.json");
  delete packageJson.private;
  console.log("stage is", stage);
  if (stage === "dev") {
    packageJson.dependencies["vote4best-contracts"] = "file:../../contracts";
  }
  if (stage === "prod") {
    packageJson.dependencies["vote4best-contracts"] = "^0.1.0";
  }
  const tsconfig = require("./tsconfig.json");
  writeFileSync(
    path.join(tsconfig.compilerOptions.outDir, "package.json"),
    JSON.stringify(packageJson, null, 2)
  );
};

copyPackgeFile();
