import fs from "fs";
const path = "src/routes/studentRoutes.js";
let s = fs.readFileSync(path, "utf8");
s = s.replace(/orderBy:\s*{\s*createdAt:\s*'\s*}/g, "orderBy: { createdAt: 'desc' }");
s = s.replace(/orderBy:\s*{\s*createdAt:\s*'\s*},/g, "orderBy: { createdAt: 'desc' },");
s = s.replace(/orderBy:\s*{\s*startedAt:\s*'\s*}/g, "orderBy: { startedAt: 'desc' }");
s = s.replace(/orderBy:\s*{\s*startedAt:\s*'\s*},/g, "orderBy: { startedAt: 'desc' },");
fs.writeFileSync(path, s);
console.log("ok");
