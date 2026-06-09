const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Professor = require("../professor");

dotenv.config();

const BASE_URL = "https://profiles.ucr.edu";
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;
const DEFAULT_DELAY_MS = 1000;
const MAX_RETRIES = 4;
const RETRYABLE_STATUSES = new Set([403, 408, 429, 500, 502, 503, 504]);

function getOption(name) {
  const index = process.argv.indexOf(name);
  return index === -1 ? null : process.argv[index + 1];
}

function parsePositiveInteger(value, fallback) {
  if (value === null) {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive integer, received: ${value}`);
  }

  return parsed;
}

function delay(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function getRetryDelay(response, attempt) {
  const retryAfter = Number(response.headers.get("retry-after"));
  return Number.isFinite(retryAfter) && retryAfter > 0
    ? retryAfter * 1000
    : attempt * 5000;
}

async function fetchWithRetry(url) {
  for (let attempt = 1; attempt <= MAX_RETRIES + 1; attempt += 1) {
    const response = await fetch(url, {
      headers: { "User-Agent": "Rate-UCR-professor-import/1.0" },
    });

    if (response.ok) {
      return response;
    }

    if (!RETRYABLE_STATUSES.has(response.status) || attempt > MAX_RETRIES) {
      throw new Error(`Request failed (${response.status}): ${url}`);
    }

    const retryDelay = getRetryDelay(response, attempt);
    console.warn(
      `Request refused (${response.status}); retrying in ${retryDelay / 1000}s: ${url}`
    );
    await delay(retryDelay);
  }
}

async function fetchText(url) {
  return (await fetchWithRetry(url)).text();
}

async function fetchJson(url) {
  return (await fetchWithRetry(url)).json();
}

function getProfileNetIds(sitemap) {
  const matches = sitemap.matchAll(
    /<loc>https:\/\/profiles\.ucr\.edu\/app\/home\/profile\/([^<]+)<\/loc>/g
  );

  return [...matches].map((match) => decodeURIComponent(match[1]));
}

function getCourses(courses) {
  if (!Array.isArray(courses)) {
    return [];
  }

  return courses.filter((course) => typeof course === "string");
}

async function importProfessors() {
  const limit = parsePositiveInteger(getOption("--limit"), Infinity);
  const delayMs = parsePositiveInteger(getOption("--delay"), DEFAULT_DELAY_MS);
  const dryRun = process.argv.includes("--dry-run");
  const sitemap = await fetchText(SITEMAP_URL);
  const netIds = getProfileNetIds(sitemap).slice(0, limit);

  console.log(`Found ${netIds.length} public profile URLs to inspect.`);

  if (!dryRun) {
    await mongoose.connect(process.env.MONGO_URI);
  }

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const [index, netId] of netIds.entries()) {
    try {
      const profile = await fetchJson(`${BASE_URL}/api/profile/${netId}`);

      if (profile.primaryAffiliation !== "Faculty" || !profile.name) {
        skipped += 1;
      } else {
        if (!dryRun) {
          await Professor.updateOne(
            { netId: profile.netId },
            {
              $set: {
                netId: profile.netId,
                name: profile.name,
                department: profile.department || "",
                organization: profile.organization || "",
                title: profile.title || "",
                profileUrl: `${BASE_URL}/app/home/profile/${profile.netId}`,
                courses: getCourses(profile.courses),
              },
            },
            { upsert: true }
          );
        }
        imported += 1;
      }
    } catch (error) {
      failed += 1;
      console.error(`Failed to import ${netId}: ${error.message}`);
    }

    if (index < netIds.length - 1) {
      await delay(delayMs);
    }

    if ((index + 1) % 100 === 0 || index === netIds.length - 1) {
      console.log(
        `Processed ${index + 1}/${netIds.length}: ` +
        `${imported} faculty, ${skipped} skipped, ${failed} failed.`
      );
    }
  }

  const importLabel = dryRun ? "eligible faculty profiles" : "imported";
  console.log(`Done. ${imported} ${importLabel}, skipped ${skipped}, failed ${failed}.`);
}

importProfessors()
  .catch((error) => {
    console.error("UCR professor import failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
