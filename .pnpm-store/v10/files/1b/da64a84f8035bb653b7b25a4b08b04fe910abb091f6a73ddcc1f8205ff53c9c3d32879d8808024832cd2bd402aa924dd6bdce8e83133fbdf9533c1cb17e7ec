# node-addon-require-builtin

Published entry package for the unrestricted `require-builtin` variant.

It exports the JavaScript API, selects a native binary through
`node-addon-native-custom-loader`, and uses a repository-only local
N-API source fallback when no current-platform optional package is usable.
Published installs do not ship native sources and fail closed instead of
compiling unvalidated local binaries.

This variant does not restrict internal module ids: `requireBuiltin(id)`
forwards any id to Node's builtin require, and `isAllowedInternalId()` always
returns `true`. For the whitelisted variant see
`node-addon-internal-loader`.

See the repository [README](../../../README.md) for usage and support status.
