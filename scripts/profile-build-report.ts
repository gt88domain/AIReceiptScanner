import {
  createProfileBuildDescriptor,
  type ProductProfileId,
} from "../packages/app-config/src/index.ts";

const profileId = process.argv.at(2) as ProductProfileId | undefined;
if (!profileId) throw new Error("Usage: tsx scripts/profile-build-report.ts <profile-id>");

console.log(JSON.stringify(createProfileBuildDescriptor(profileId)));
