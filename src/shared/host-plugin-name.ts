/**
 * Bare npm package name accepted for Desktop host plugins.
 * Mirrors the official Desktop PACKAGE_NAME (including `~`); anchors keep newlines out of generated YAML.
 */
export const HOST_PLUGIN_NAME = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/u
