// On-disk job records, one JSON sidecar per render in public/renders/. A job is created
// "processing" up front and updated to "done"/"error" when the background pipeline finishes — so a
// page refresh mid-generation can re-attach to the in-flight job (the work keeps running
// server-side). A production app would use a DB + a real queue/worker; this is the starter level.
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import path from "node:path";

const DIR = path.join(process.cwd(), "public", "renders");

export type JobStatus = "processing" | "done" | "error";
export type Job = {
  id: string;
  title: string;
  avatar: string;
  status: JobStatus;
  createdAt: string;
  url?: string;
  error?: string;
  billing?: boolean;
  pricingUrl?: string;
};

const file = (id: string) => path.join(DIR, `${id}.json`);

export async function writeJob(id: string, patch: Partial<Job>): Promise<void> {
  await mkdir(DIR, { recursive: true });
  let existing: Partial<Job> = {};
  try {
    existing = JSON.parse(await readFile(file(id), "utf8"));
  } catch {
    /* first write */
  }
  await writeFile(file(id), JSON.stringify({ ...existing, ...patch, id }));
}

export async function listJobs(): Promise<Job[]> {
  let files: string[] = [];
  try {
    files = await readdir(DIR);
  } catch {
    return [];
  }
  const jobs = await Promise.all(
    files
      .filter((f) => f.endsWith(".json"))
      .map(async (f) => {
        try {
          const j = JSON.parse(await readFile(path.join(DIR, f), "utf8")) as Job;
          // Normalize older records that predate the status field: a sidecar with a url is done.
          if (!j.status) j.status = j.url ? "done" : "processing";
          return j;
        } catch {
          return null;
        }
      }),
  );
  return jobs.filter(Boolean).sort((a, b) => ((a as Job).createdAt < (b as Job).createdAt ? 1 : -1)) as Job[];
}
