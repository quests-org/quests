import {
  APPS_SERVER_API_PATH,
  LOCAL_LOOPBACK_APPS_SERVER_DOMAIN,
  LOCALHOST_APPS_SERVER_DOMAIN,
} from "../logic/server/constants";
import { getWorkspaceServerPort } from "../logic/server/url";
import { type AppSubdomain } from "../schemas/subdomains";

export function localhostUrl(subdomain: AppSubdomain) {
  return `http://${subdomain}.${LOCALHOST_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}`;
}

export function loopbackUrl(subdomain: AppSubdomain) {
  return `http://${subdomain}.${LOCAL_LOOPBACK_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}`;
}

export function urlsForSubdomain(subdomain: AppSubdomain) {
  return {
    assetBase: assetBaseUrl(subdomain),
    localhost: localhostUrl(subdomain),
    localRedirect: localRedirectUrl(subdomain),
    loopback: loopbackUrl(subdomain),
  };
}

function assetBaseUrl(subdomain: AppSubdomain) {
  return `${localhostUrl(subdomain)}${APPS_SERVER_API_PATH}/assets`;
}

function localRedirectUrl(subdomain: AppSubdomain) {
  return `http://${LOCAL_LOOPBACK_APPS_SERVER_DOMAIN}:${getWorkspaceServerPort()}/redirect/${subdomain}`;
}
