import fs from "fs";
const path = "src/routes/studentRoutes.js";
let s = fs.readFileSync(path, "utf8");
s = s.replace(/lessons\.'' }/g, "lessons.' }");
fs.writeFileSync(path, s);
console.log("ok");
