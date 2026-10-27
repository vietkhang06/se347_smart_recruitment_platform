import { readFileSync } from "node:fs";
import { validateMatchingResult } from "../../frontend/src/services/contracts/matchingResult.contract.js";
const payload = JSON.parse(readFileSync(process.argv[2], "utf8"));
validateMatchingResult(payload, process.argv[3] || payload.applicationId);
console.log("Frontend runtime contract: PASS");
