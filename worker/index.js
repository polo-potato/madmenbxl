const MAX_BODY_BYTES = 1_000_000;
const SESSION_COOKIE = "what_if_writer_session";
const OAUTH_COOKIE = "what_if_writer_oauth";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const OAUTH_SECONDS = 10 * 60;

export function isAllowedContentPath(path) {
  return /^content\/(?:[a-z0-9][a-z0-9._-]*\/)*[a-z0-9][a-z0-9._-]*\.(?:md|json)$/i.test(path);
}

export function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  }
  return btoa(binary);
}

export function decodeBase64(value) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function base64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function randomToken(size = 32) {
  return base64Url(crypto.getRandomValues(new Uint8Array(size)));
}

async function pkceChallenge(verifier) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
  return base64Url(digest);
}

async function safeEqual(left, right) {
  const [a, b] = [new TextEncoder().encode(left), new TextEncoder().encode(right)];
  let difference = a.length ^ b.length;
  for (let index = 0; index < Math.max(a.length, b.length); index += 1) {
    difference |= (a[index % a.length] || 0) ^ (b[index % b.length] || 0);
  }
  return difference === 0;
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      ...headers
    }
  });
}

async function boundedJson(request) {
  const length = Number(request.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES) throw new Response("Payload too large", { status: 413 });
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new Response("Payload too large", { status: 413 });
  }
  return JSON.parse(text);
}

function cookieValue(request, name) {
  const match = request.headers.get("Cookie")?.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : "";
}

function cookie(name, value, maxAge, sameSite = "Strict") {
  return `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=${sameSite}`;
}

function sameOrigin(request) {
  const origin = request.headers.get("Origin");
  return !origin || origin === new URL(request.url).origin;
}

async function getSession(request, env) {
  const id = cookieValue(request, SESSION_COOKIE);
  if (!id || !env.SESSIONS) return null;
  const session = await env.SESSIONS.get(`session:${id}`, { type: "json" });
  return session ? { ...session, id } : null;
}

async function activeSession(request, env) {
  const session = await getSession(request, env);
  if (!session || !session.accessTokenExpiresAt || session.accessTokenExpiresAt > Date.now() + 5 * 60 * 1000) {
    return session;
  }
  if (!session.refreshToken || !env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET) {
    await env.SESSIONS.delete(`session:${session.id}`);
    return null;
  }
  try {
    const refreshed = await githubJson("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: env.GITHUB_CLIENT_ID,
        client_secret: env.GITHUB_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: session.refreshToken
      })
    });
    const updated = {
      ...session,
      accessToken: refreshed.access_token,
      refreshToken: refreshed.refresh_token || session.refreshToken,
      accessTokenExpiresAt: refreshed.expires_in ? Date.now() + refreshed.expires_in * 1000 : null,
      refreshTokenExpiresAt: refreshed.refresh_token_expires_in ? Date.now() + refreshed.refresh_token_expires_in * 1000 : session.refreshTokenExpiresAt
    };
    delete updated.id;
    await env.SESSIONS.put(`session:${session.id}`, JSON.stringify(updated), { expirationTtl: SESSION_SECONDS });
    return { ...updated, id: session.id };
  } catch (error) {
    console.error(JSON.stringify({ event: "github_oauth_refresh_failed", login: session.login, message: error.message }));
    await env.SESSIONS.delete(`session:${session.id}`);
    return null;
  }
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    "User-Agent": "madmenbxl-writers-room",
    "X-GitHub-Api-Version": "2022-11-28",
    Authorization: `Bearer ${token}`
  };
}

function githubContentUrl(path, env) {
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  return `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${encodedPath}`;
}

async function githubJson(url, options = {}) {
  const response = await fetch(url, options);
  const length = Number(response.headers.get("Content-Length") || 0);
  if (length > MAX_BODY_BYTES * 2) throw new Error("GitHub response is too large");
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.message || "GitHub request failed");
    error.status = response.status;
    throw error;
  }
  return result;
}

async function githubFileOrNull(path, env, token) {
  try { return await githubFile(path, env, token); }
  catch (error) { if (error.status === 404) return null; throw error; }
}

async function githubFile(path, env, token) {
  const result = await githubJson(
    `${githubContentUrl(path, env)}?ref=${encodeURIComponent(env.GITHUB_BRANCH)}`,
    { headers: githubHeaders(token) }
  );
  if (result.type !== "file" || typeof result.content !== "string") throw new Error("Unsupported GitHub content");
  return { content: decodeBase64(result.content), sha: result.sha };
}

async function draftRow(path, env) {
  return env.DRAFTS_DB.prepare(
    "SELECT path, content, base_sha, version, saved_at, saved_by, operation FROM drafts WHERE path = ?"
  ).bind(path).first();
}

async function draftRows(prefix, env) {
  return (await env.DRAFTS_DB.prepare(
    "SELECT path, content, base_sha, version, saved_at, saved_by, operation FROM drafts WHERE path LIKE ? ORDER BY path"
  ).bind(`${prefix}%`).all()).results || [];
}

function combinedContent(remote, draft) {
  if (!draft) return remote ? { ...remote, remoteSha: remote.sha, source: "github", draftVersion: null } : null;
  if (draft.operation === "delete") return null;
  return {
    content: draft.content,
    sha: draft.base_sha,
    remoteSha: remote?.sha || null,
    source: "dev",
    draftVersion: draft.version,
    savedAt: draft.saved_at,
    savedBy: draft.saved_by,
    remoteChanged: draft.base_sha !== (remote?.sha || "")
  };
}

async function saveDevDraft(payload, env, session) {
  const path = payload.path || "";
  if (!isAllowedContentPath(path)) return json({ error: "This content path is not allowed." }, 400);
  const operation = payload.operation === "delete" ? "delete" : "upsert";
  if (operation === "upsert" && typeof payload.content !== "string") return json({ error: "Content must be text." }, 400);
  const [remote, existing] = await Promise.all([
    githubFileOrNull(path, env, session.accessToken),
    draftRow(path, env)
  ]);
  const expectedVersion = payload.expectedDraftVersion || null;
  if ((existing?.version || null) !== expectedVersion) {
    return json({ error: "The dev draft changed after this file was loaded.", draftVersion: existing?.version || null }, 409);
  }
  const expectedBase = existing?.base_sha ?? remote?.sha ?? "";
  if ((payload.baseSha || "") !== expectedBase) {
    return json({ error: "The file base changed after this file was loaded.", remoteSha: remote?.sha || null }, 409);
  }
  if ((operation === "delete" && !remote) || (operation === "upsert" && payload.content === remote?.content)) {
    if (existing) {
      await env.DRAFTS_DB.prepare("DELETE FROM drafts WHERE path = ? AND version = ?")
        .bind(path, existing.version).run();
    }
    return json({ ...(combinedContent(remote, null) || { content: "", sha: "", source: "github", draftVersion: null }), cleared: true });
  }
  const version = crypto.randomUUID();
  const savedAt = Date.now();
  try {
    const result = existing
      ? await env.DRAFTS_DB.prepare(`
          UPDATE drafts
          SET content = ?, base_sha = ?, version = ?, saved_at = ?, saved_by = ?, operation = ?
          WHERE path = ? AND version = ?
        `).bind(payload.content || "", expectedBase, version, savedAt, session.login, operation, path, existing.version).run()
      : await env.DRAFTS_DB.prepare(`
          INSERT INTO drafts (path, content, base_sha, version, saved_at, saved_by, operation)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).bind(path, payload.content || "", expectedBase, version, savedAt, session.login, operation).run();
    if (!result.meta?.changes) {
      return json({ error: "The dev draft changed while it was being saved." }, 409);
    }
  } catch (error) {
    if (String(error.message).includes("UNIQUE constraint failed")) {
      return json({ error: "The dev draft changed while it was being saved." }, 409);
    }
    throw error;
  }
  return json(combinedContent(remote, {
    content: payload.content || "",
    base_sha: expectedBase,
    version,
    saved_at: savedAt,
    saved_by: session.login,
    operation
  }));
}

async function publishFile(payload, env, session) {
  if (!isAllowedContentPath(payload.path || "")) return json({ error: "This content path is not allowed." }, 400);
  if (typeof payload.content !== "string") return json({ error: "Content must be text." }, 400);
  const draft = await draftRow(payload.path, env);
  if (!draft || !payload.expectedDraftVersion || draft.version !== payload.expectedDraftVersion) {
    return json({ error: "The dev draft changed after this file was loaded.", draftVersion: draft?.version || null }, 409);
  }
  if (draft.content !== payload.content || draft.base_sha !== payload.expectedSha) {
    return json({ error: "The editor content no longer matches the saved dev draft." }, 409);
  }
  const current = await githubFileOrNull(payload.path, env, session.accessToken);
  if ((payload.expectedSha || "") !== (current?.sha || "")) {
    return json({ error: "The GitHub file changed after this draft was loaded.", remoteSha: current?.sha || null }, 409);
  }
  const deleting = draft.operation === "delete";
  const response = await fetch(githubContentUrl(payload.path, env), {
    method: deleting ? "DELETE" : "PUT",
    headers: { ...githubHeaders(session.accessToken), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: String(payload.message || `Update ${payload.path}`).slice(0, 120),
      ...(!deleting ? { content: encodeBase64(payload.content) } : {}),
      ...(current ? { sha: current.sha } : {}),
      branch: env.GITHUB_BRANCH
    })
  });
  const result = await response.json();
  if (!response.ok) return json({ error: result.message || "GitHub rejected the update." }, response.status);
  await env.DRAFTS_DB.prepare("DELETE FROM drafts WHERE path = ? AND version = ?")
    .bind(payload.path, draft.version).run();
  return json({ sha: result.content?.sha || null, commit: result.commit.sha, author: session.login, deleted: deleting });
}

async function serveAsset(request, env) {
  const response = await env.ASSETS.fetch(request);
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "same-origin");
  if (new URL(request.url).pathname.startsWith("/writer")) {
    headers.set("Cache-Control", "no-store");
    headers.set("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: https://avatars.githubusercontent.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

async function beginGithubLogin(request, env) {
  if (!env.GITHUB_CLIENT_ID || !env.GITHUB_CLIENT_SECRET || !env.SESSIONS) {
    return json({ error: "GitHub login is not configured yet." }, 503);
  }
  const url = new URL(request.url);
  const state = randomToken();
  const verifier = randomToken(48);
  const authorize = new URL("https://github.com/login/oauth/authorize");
  authorize.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/github/callback`);
  authorize.searchParams.set("scope", "read:user public_repo");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", await pkceChallenge(verifier));
  authorize.searchParams.set("code_challenge_method", "S256");
  return new Response(null, {
    status: 302,
    headers: {
      Location: authorize.toString(),
      "Set-Cookie": cookie(OAUTH_COOKIE, `${state}.${verifier}`, OAUTH_SECONDS, "Lax"),
      "Cache-Control": "no-store"
    }
  });
}

async function finishGithubLogin(request, env) {
  const url = new URL(request.url);
  const [cookieState, verifier] = cookieValue(request, OAUTH_COOKIE).split(".");
  const state = url.searchParams.get("state") || "";
  const code = url.searchParams.get("code") || "";
  if (!code || !cookieState || !verifier || !await safeEqual(state, cookieState)) {
    return Response.redirect(new URL("/writer/login?error=invalid_oauth_state", url), 302);
  }
  const tokenResponse = await githubJson("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/api/auth/github/callback`,
      code_verifier: verifier
    })
  });
  const scopes = String(tokenResponse.scope || "").split(",").map(scope => scope.trim());
  if (!scopes.includes("public_repo") && !scopes.includes("repo")) {
    return Response.redirect(new URL("/writer/login?error=missing_scope", url), 302);
  }
  const headers = githubHeaders(tokenResponse.access_token);
  const [user, repository] = await Promise.all([
    githubJson("https://api.github.com/user", { headers }),
    githubJson(`https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}`, { headers })
  ]);
  if (!repository.permissions?.push) {
    return Response.redirect(new URL("/writer/login?error=not_collaborator", url), 302);
  }
  const sessionId = randomToken();
  await env.SESSIONS.put(`session:${sessionId}`, JSON.stringify({
    accessToken: tokenResponse.access_token,
    refreshToken: tokenResponse.refresh_token || null,
    accessTokenExpiresAt: tokenResponse.expires_in ? Date.now() + tokenResponse.expires_in * 1000 : null,
    refreshTokenExpiresAt: tokenResponse.refresh_token_expires_in ? Date.now() + tokenResponse.refresh_token_expires_in * 1000 : null,
    login: user.login,
    avatarUrl: user.avatar_url
  }), { expirationTtl: SESSION_SECONDS });
  return new Response(null, {
    status: 302,
    headers: {
      Location: "/writer/",
      "Set-Cookie": cookie(SESSION_COOKIE, sessionId, SESSION_SECONDS),
      "Cache-Control": "no-store"
    }
  });
}

async function handleRequest(request, env) {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/auth/github") return beginGithubLogin(request, env);
  if (path === "/api/auth/github/callback") {
    try {
      return await finishGithubLogin(request, env);
    } catch (error) {
      console.error(JSON.stringify({ event: "github_oauth_error", message: error.message }));
      return Response.redirect(new URL("/writer/login?error=github_oauth_failed", url), 302);
    }
  }
  if (path === "/api/session") {
    const session = await activeSession(request, env);
    return json({ authenticated: Boolean(session), user: session ? { login: session.login, avatarUrl: session.avatarUrl } : null });
  }
  if (path === "/api/logout") {
    if (request.method !== "POST" || !sameOrigin(request)) return json({ error: "Method not allowed." }, 405);
    const session = await getSession(request, env);
    if (session) await env.SESSIONS.delete(`session:${session.id}`);
    return json({ ok: true }, 200, { "Set-Cookie": cookie(SESSION_COOKIE, "", 0) });
  }

  if (["/writer/login", "/writer/login/", "/writer/login.html", "/writer/login.js", "/writer/login.css"].includes(path)) {
    return serveAsset(request, env);
  }

  const session = await activeSession(request, env);
  if (path === "/writer" || path.startsWith("/writer/")) {
    if (!session) {
      const login = new URL("/writer/login", url);
      login.searchParams.set("next", path === "/writer" ? "/writer/" : path);
      return Response.redirect(login, 302);
    }
    return serveAsset(request, env);
  }

  if (path.startsWith("/api/")) {
    if (!session) return json({ error: "Authentication required." }, 401);
    try {
      if (path === "/api/content" && request.method === "GET") {
        const filePath = url.searchParams.get("path") || "";
        if (!isAllowedContentPath(filePath)) return json({ error: "This content path is not allowed." }, 400);
        const [remote, draft] = await Promise.all([
          githubFileOrNull(filePath, env, session.accessToken),
          draftRow(filePath, env)
        ]);
        const combined = combinedContent(remote, draft);
        return combined ? json(combined) : json({ error: "Content not found." }, 404);
      }
      if (path === "/api/drafts" && request.method === "GET") {
        const prefix = url.searchParams.get("prefix") || "";
        if (!/^content\/elements\/[a-z0-9_-]+\/$/i.test(prefix)) return json({ error: "This draft prefix is not allowed." }, 400);
        return json({ drafts: await draftRows(prefix, env) });
      }
      if (path === "/api/draft" && request.method === "POST" && sameOrigin(request)) {
        return saveDevDraft(await boundedJson(request), env, session);
      }
      if (path === "/api/publish" && request.method === "POST" && sameOrigin(request)) {
        return publishFile(await boundedJson(request), env, session);
      }
      return json({ error: "Not found." }, 404);
    } catch (error) {
      if (error instanceof Response) return error;
      console.error(JSON.stringify({ event: "writer_api_error", path, login: session.login, message: error.message }));
      return json({ error: "The editor service could not complete this request." }, 502);
    }
  }

  return serveAsset(request, env);
}

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  }
};
