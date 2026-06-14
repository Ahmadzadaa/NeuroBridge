async function testLogin() {
  const jar: string[] = [];

  function storeCookies(res: Response) {
    const raw = res.headers.getSetCookie?.() ?? [];
    for (const c of raw) {
      const name = c.split("=")[0];
      jar.filter((x) => !x.startsWith(`${name}=`));
      jar.push(c.split(";")[0]!);
    }
  }

  const csrfRes = await fetch("http://localhost:3000/api/auth/csrf");
  storeCookies(csrfRes);
  const { csrfToken } = (await csrfRes.json()) as { csrfToken: string };

  const loginRes = await fetch("http://localhost:3000/api/auth/callback/credentials", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Cookie: jar.join("; "),
    },
    body: new URLSearchParams({
      csrfToken,
      email: "participant@demo.com",
      password: "Admin123!",
      callbackUrl: "http://localhost:3000/en/login",
      json: "true",
    }),
    redirect: "manual",
  });
  storeCookies(loginRes);

  console.log("login:", loginRes.status, loginRes.headers.get("location"));

  const sessionRes = await fetch("http://localhost:3000/api/auth/session", {
    headers: { Cookie: jar.join("; ") },
  });
  console.log("session:", await sessionRes.json());
}

testLogin().catch(console.error);
