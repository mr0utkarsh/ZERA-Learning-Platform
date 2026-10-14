import fs from "fs";
const path = "src/routes/studentRoutes.js";
let s = fs.readFileSync(path, "utf8");
s = s.replace(/[\u2018\u2019]/g, "'");
s = s.replace(/[\u201c\u201d]/g, '"');
s = s.replace(/Progress is tracked per course once you save a syllabus and complete lessons\./g, "Progress is tracked per course once you save a syllabus and complete lessons.");
fs.writeFileSync(path, s);
console.log("ok");
