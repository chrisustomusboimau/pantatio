import fs from "fs";
import path from "path";

const clientDir = path.resolve("dist/client");
const assetsDir = path.join(clientDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error("❌ assets folder not found:", assetsDir);
  process.exit(1);
}

const files = fs.readdirSync(assetsDir);

// cari JS entry utama
const entry = files.find(
  (f) =>
    f.startsWith("index-") &&
    f.endsWith(".js") &&
    !f.includes("server")
);

if (!entry) {
  console.error("❌ JS entry not found in assets");
  process.exit(1);
}

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pantatio</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/${entry}"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(clientDir, "index.html"), html);

console.log("✅ Fake index.html generated:", entry);