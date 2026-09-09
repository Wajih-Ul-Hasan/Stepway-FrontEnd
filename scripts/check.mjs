import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { Script, runInNewContext } from "node:vm";
import { spawnSync } from "node:child_process";

for (const name of readdirSync("js").filter(n => n.endsWith(".js"))) {
    const source = readFileSync("js/" + name, "utf8");
    new Script(source, { filename: name });
    if (name !== "config.js") assert(!source.includes("http://localhost:8080"), name + " has hardcoded API URL");
}
for (const name of readdirSync(".").filter(n => n.endsWith(".html"))) {
    const html = readFileSync(name, "utf8");
    const config = html.indexOf('src="js/config.js"');
    const helper = html.indexOf('src="js/api-config.js"');
    assert(config >= 0 && helper > config, name + " missing API configuration");
    for (const match of html.matchAll(/<script[^>]+src=["'](js\/[^"']+)["']/gi)) {
        if (!["js/config.js", "js/api-config.js"].includes(match[1])) {
            assert(match.index > helper, name + " loads application script before config");
        }
    }
}
const context = { window: { STEPWAY_API_BASE_URL: "https://api.example.com/" } };
runInNewContext(readFileSync("js/api-config.js", "utf8"), context);
assert.equal(context.window.stepwayApi("/api/courses?pageNumber=2"), "https://api.example.com/api/courses?pageNumber=2");

for (const value of ["", "http://api.example.com", "https://localhost", "https://api.example.com/api", "https://user:pass@api.example.com"]) {
    const result = spawnSync(process.execPath, ["scripts/build.mjs"], {
        env: { ...process.env, STEPWAY_API_BASE_URL: value }, encoding: "utf8"
    });
    assert.notEqual(result.status, 0, "Build accepted invalid origin " + value);
}
const build = spawnSync(process.execPath, ["scripts/build.mjs"], {
    env: { ...process.env, STEPWAY_API_BASE_URL: "https://api.example.com/" }, encoding: "utf8"
});
assert.equal(build.status, 0, build.stderr);
assert(readFileSync("public/js/config.js", "utf8").includes('"https://api.example.com"'));
assert(existsSync("public/index.html"));
assert(!existsSync("public/.git"));
assert(!existsSync("public/.env"));
assert(!existsSync("public/stepway.env"));

// Login must decode Base64URL and only persist valid tokens.
const roles = Buffer.from(JSON.stringify({ ROLES: ["ADMIN"] })).toString("base64url");
const token = "header." + roles + ".signature";
const stored = {};
let alerted = false;
const loginContext = {
    document: { getElementById: id => ({ value: id === "username" ? "demo@example.com" : "password" }) },
    localStorage: { setItem: (k, v) => { stored[k] = v; }, removeItem: k => { delete stored[k]; } },
    window: { location: {} },
    stepwayApi: p => "https://api.example.com" + p,
    fetch: async () => ({ ok: true, json: async () => ({ accessToken: token }) }),
    atob: s => Buffer.from(s, "base64").toString("binary"),
    alert: () => { alerted = true; }
};
runInNewContext(readFileSync("js/login.js", "utf8"), loginContext);
await loginContext.login();
assert.equal(stored.token, token);
assert.equal(loginContext.window.location.href, "AdminDashboard.html");
loginContext.fetch = async () => ({ ok: false });
await loginContext.login();
assert.equal(stored.token, undefined);
assert(alerted);
console.log("Frontend syntax, configuration, deployment build and login checks passed.");
