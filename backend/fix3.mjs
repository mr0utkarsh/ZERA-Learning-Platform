import fs from "fs";
const path = "src/routes/studentRoutes.js";
let s = fs.readFileSync(path, "utf8");
s = s.replace("overallProgressNote:  is tracked per course once you save a syllabus and complete lessons.", "overallProgressNote: 'Progress is tracked per course once you save a syllabus and complete lessons.'");
s = s.replace(/' } \);/g, "' } });");
fs.writeFileSync(path, s);
console.log("ok");
