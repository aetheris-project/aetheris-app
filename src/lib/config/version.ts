/**
 * Single source of truth for the platform version.
 *
 * Reads the version from package.json at build time so the admin Status
 * page, the API and any future upgrade checker always agree.
 */

import packageJson from "../../../package.json";

export const packageVersion: string = packageJson.version;

export const PLATFORM_NAME = "Aetheris";
