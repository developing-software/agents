import { createClient } from "@openauthjs/openauth/client";
import type { Context } from "hono";
import {
  deleteCookie,
  getCookie,
  setCookie,
  // TODO: use signed cookies
  // getSignedCookie,
  // setSignedCookie,
  // generateCookie,
  // generateSignedCookie,
} from "hono/cookie";
// import issuer from './index'

export const authClient = createClient({
  clientID: "api",
  issuer: process.env.AUTH_URL ?? "http://localhost:3002",
});
// export const authClient = issuer.request

export async function getTokens(c: Context) {
  // const cookies = await getCookies()
  const access = getCookie(c, "access_token") || undefined;
  const refresh = getCookie(c, "refresh_token") || undefined;

  // const access = cookies.get("access_token") || null
  // const refresh = cookies.get("refresh_token") || null
  return { access, refresh };
}

export function deleteTokens(c: Context) {
  // const cookies = await getCookies()
  deleteCookie(c, "access_token");
  deleteCookie(c, "refresh_token");
  // cookies.delete("access_token")
  // cookies.delete("refresh_token")
}
export async function setTokens(c: Context, access: string, refresh: string) {
  // const cookies = await getCookies()

  setCookie(c, "access_token", access, {
    // name: "access_token",
    // value: access,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 34560000,
  });
  setCookie(c, "refresh_token", refresh, {
    // name: "refresh_token",
    // value: refresh,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 34560000,
  });
  // cookies.set({
  //   name: "access_token",
  //   value: access,
  //   httpOnly: true,
  //   sameSite: "lax",
  //   path: "/",
  //   maxAge: 34560000,
  // })
  // cookies.set({
  //   name: "refresh_token",
  //   value: refresh,
  //   httpOnly: true,
  //   sameSite: "lax",
  //   path: "/",
  //   maxAge: 34560000,
  // })
}
