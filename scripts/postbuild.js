import fs from "fs";
import path from "path";

const dist = "dist/client";
const assetsDir = path.join(dist, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error("❌ assets folder not found");
  process.exit(1);
}

const jsFile = fs
  .readdirSync(assetsDir)
  .find((f) => f.endsWith(".js"));

if (!jsFile) {
  console.error("❌ JS bundle not found");
  process.exit(1);
}

const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Static Prototype</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/assets/${jsFile}"></script>
  </body>
</html>
`;

fs.writeFileSync(path.join(dist, "index.html"), html);
console.log("✅ Fake index.html generated");