#!/usr/bin/env node
// Pushes docs/appstore-listing.md, the age rating and the country list to App Store Connect.
// Usage: set -a; source ~/.appstoreconnect/bebear.env; set +a; node scripts/appstore-listing.mjs [--attach-build <number>]
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APP_ID = "6826578682";
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function token() {
  const kid = process.env.ASC_KEY_ID;
  const iss = process.env.ASC_ISSUER_ID;
  if (!kid || !iss) {
    throw new Error("ASC_KEY_ID and ASC_ISSUER_ID must be set from ~/.appstoreconnect/bebear.env");
  }
  const key = fs.readFileSync(path.join(process.env.HOME, ".appstoreconnect/private_keys", `AuthKey_${kid}.p8`));
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = `${b64({ alg: "ES256", kid, typ: "JWT" })}.${b64({ iss, iat: now, exp: now + 1200, aud: "appstoreconnect-v1" })}`;
  const sig = crypto.sign("sha256", Buffer.from(body), { key, dsaEncoding: "ieee-p1363" }).toString("base64url");
  return `${body}.${sig}`;
}

const bearer = token();

async function api(method, urlPath, body) {
  const res = await fetch(`https://api.appstoreconnect.apple.com${urlPath}`, {
    method,
    headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    const detail = (json.errors ?? []).map((e) => `${e.title}: ${e.detail}`).join("; ");
    throw new Error(`${method} ${urlPath} -> ${res.status} ${detail}`);
  }
  return json;
}

function sections(markdown) {
  const out = {};
  let current;
  for (const line of markdown.split("\n")) {
    const heading = /^## (.+)$/.exec(line);
    if (heading) {
      current = heading[1];
      out[current] = [];
    } else if (current) {
      out[current].push(line);
    }
  }
  return Object.fromEntries(Object.entries(out).map(([k, v]) => [k, v.join("\n").trim()]));
}

function urlFrom(block, label) {
  const match = new RegExp(`^- ${label}: (\\S+)$`, "m").exec(block);
  if (!match) {
    throw new Error(`No "${label}" URL in docs/appstore-listing.md`);
  }
  return match[1];
}

const AGE_RATING = {
  alcoholTobaccoOrDrugUseOrReferences: "NONE",
  contests: "NONE",
  gamblingSimulated: "NONE",
  gunsOrOtherWeapons: "NONE",
  horrorOrFearThemes: "NONE",
  matureOrSuggestiveThemes: "NONE",
  medicalOrTreatmentInformation: "NONE",
  profanityOrCrudeHumor: "NONE",
  sexualContentGraphicAndNudity: "NONE",
  sexualContentOrNudity: "NONE",
  violenceCartoonOrFantasy: "NONE",
  violenceRealistic: "NONE",
  violenceRealisticProlongedGraphicOrSadistic: "NONE",
  gambling: false,
  lootBox: false,
  unrestrictedWebAccess: false,
  advertising: false,
  ageAssurance: false,
  healthOrWellnessTopics: true,
  messagingAndChat: false,
  parentalControls: false,
  userGeneratedContent: true,
  // The friends feed shows posts and meal photos to accepted friends, so it counts as a social feature.
  socialMedia: true,
  socialMediaAgeRestricted: false,
  sharedLocation: false,
};

async function pushText(listing) {
  const version = (await api("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=1`)).data[0];
  const [loc] = (await api("GET", `/v1/appStoreVersions/${version.id}/appStoreVersionLocalizations`)).data;
  await api("PATCH", `/v1/appStoreVersionLocalizations/${loc.id}`, {
    data: {
      type: "appStoreVersionLocalizations",
      id: loc.id,
      attributes: {
        description: listing.Description,
        keywords: listing.Keywords,
        promotionalText: listing["Promotional text"],
        supportUrl: urlFrom(listing.URLs, "Support"),
      },
    },
  });
  console.log(`Version ${version.attributes.versionString} text: done`);

  const info = (await api("GET", `/v1/apps/${APP_ID}/appInfos`)).data[0];
  const [infoLoc] = (await api("GET", `/v1/appInfos/${info.id}/appInfoLocalizations`)).data;
  await api("PATCH", `/v1/appInfoLocalizations/${infoLoc.id}`, {
    data: {
      type: "appInfoLocalizations",
      id: infoLoc.id,
      attributes: {
        name: listing.Name,
        subtitle: listing.Subtitle,
        privacyPolicyUrl: urlFrom(listing.URLs, "Privacy policy"),
      },
    },
  });
  await api("PATCH", `/v1/appInfos/${info.id}`, {
    data: {
      type: "appInfos",
      id: info.id,
      relationships: { primaryCategory: { data: { type: "appCategories", id: "HEALTH_AND_FITNESS" } } },
    },
  });
  console.log("Name, subtitle, privacy URL, category: done");

  const rating = (await api("GET", `/v1/appInfos/${info.id}/ageRatingDeclaration`)).data;
  await api("PATCH", `/v1/ageRatingDeclarations/${rating.id}`, {
    data: { type: "ageRatingDeclarations", id: rating.id, attributes: AGE_RATING },
  });
  console.log("Age rating: done");

  const { REVIEW_FIRST_NAME, REVIEW_LAST_NAME, REVIEW_PHONE } = process.env;
  if (!REVIEW_FIRST_NAME || !REVIEW_LAST_NAME || !REVIEW_PHONE) {
    console.log("Review notes: skipped. Set REVIEW_FIRST_NAME, REVIEW_LAST_NAME and REVIEW_PHONE (+country code)");
    return;
  }
  const review = await api("GET", `/v1/appStoreVersions/${version.id}/appStoreReviewDetail`).catch(() => ({ data: null }));
  const reviewAttributes = {
    contactFirstName: REVIEW_FIRST_NAME,
    contactLastName: REVIEW_LAST_NAME,
    contactPhone: REVIEW_PHONE,
    contactEmail: "support@paulbebear.com",
    demoAccountRequired: false,
    notes: listing["Review notes"],
  };
  if (review.data) {
    await api("PATCH", `/v1/appStoreReviewDetails/${review.data.id}`, {
      data: { type: "appStoreReviewDetails", id: review.data.id, attributes: reviewAttributes },
    });
  } else {
    await api("POST", "/v1/appStoreReviewDetails", {
      data: {
        type: "appStoreReviewDetails",
        attributes: reviewAttributes,
        relationships: { appStoreVersion: { data: { type: "appStoreVersions", id: version.id } } },
      },
    });
  }
  console.log("Review notes: done");
}

async function pushCountries() {
  const existing = await api("GET", `/v1/apps/${APP_ID}/appAvailabilityV2`).catch(() => undefined);
  if (existing?.data) {
    console.log("Countries: already set, left as they are");
    return;
  }
  const territories = (await api("GET", "/v1/territories?limit=200")).data;
  const included = territories.map((t, i) => ({
    type: "territoryAvailabilities",
    id: `\${t${i}}`,
    attributes: { available: true },
    relationships: { territory: { data: { type: "territories", id: t.id } } },
  }));
  await api("POST", "/v2/appAvailabilities", {
    data: {
      type: "appAvailabilities",
      attributes: { availableInNewTerritories: true },
      relationships: {
        app: { data: { type: "apps", id: APP_ID } },
        territoryAvailabilities: { data: included.map(({ type, id }) => ({ type, id })) },
      },
    },
    included,
  });
  console.log(`Countries: all ${territories.length}`);
}

async function attachBuild(number) {
  const version = (await api("GET", `/v1/apps/${APP_ID}/appStoreVersions?filter[platform]=IOS&limit=1`)).data[0];
  const builds = await api(
    "GET",
    `/v1/builds?filter[app]=${APP_ID}&filter[version]=${number}&filter[preReleaseVersion.version]=${version.attributes.versionString}`
  );
  const build = builds.data[0];
  if (!build) {
    throw new Error(`No build ${number} for version ${version.attributes.versionString}`);
  }
  if (build.attributes.processingState !== "VALID") {
    throw new Error(`Build ${number} is ${build.attributes.processingState}, wait for VALID`);
  }
  await api("PATCH", `/v1/appStoreVersions/${version.id}/relationships/build`, { data: { type: "builds", id: build.id } });
  console.log(`Build ${version.attributes.versionString} (${number}) attached`);
}

const args = process.argv.slice(2);
if (args[0] === "--attach-build" && args[1]) {
  await attachBuild(args[1]);
} else {
  const listing = sections(fs.readFileSync(path.join(root, "docs/appstore-listing.md"), "utf8"));
  await pushText(listing);
  await pushCountries();
}
