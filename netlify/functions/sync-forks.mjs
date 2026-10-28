// Syncs every fork of sitizuliatulf's repos in this account with its upstream.
const OWNER = "rafifajar";
const UPSTREAM_OWNER = "sitizuliatulf";
const API = "https://api.github.com";

export default async () => {
  const token = process.env.GITHUB_SYNC_TOKEN;
  if (!token) {
    console.error("GITHUB_SYNC_TOKEN is not set");
    return;
  }
  const headers = {
    Authorization: "Bearer " + token,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    "User-Agent": "netlify-sync-forks",
  };

  const listRes = await fetch(API + "/user/repos?affiliation=owner&per_page=100", { headers });
  const repos = await listRes.json();
  if (!Array.isArray(repos)) {
    console.error("Could not list repos: " + listRes.status + " " + (repos.message || ""));
    return;
  }

  for (const repo of repos.filter((r) => r.fork && r.owner.login === OWNER)) {
    try {
      const detail = await (await fetch(API + "/repos/" + repo.full_name, { headers })).json();
      if (!detail.parent || detail.parent.owner.login !== UPSTREAM_OWNER) continue;
      const res = await fetch(API + "/repos/" + repo.full_name + "/merge-upstream", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ branch: repo.default_branch }),
      });
      const body = await res.json().catch(() => ({}));
      console.log(repo.full_name + ": " + res.status + " " + (body.merge_type || body.message || ""));
    } catch (err) {
      console.error(repo.full_name + ": " + err);
    }
  }
};

export const config = { schedule: "*/15 * * * *" };
