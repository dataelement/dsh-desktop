<a href="https://agentclientprotocol.com/" >
  <img alt="Agent Client Protocol" src="https://zed.dev/img/acp/banner-dark.webp">
</a>

# ACP TypeScript Library

The official TypeScript implementation of the Agent Client Protocol (ACP) — a standardized communication protocol between code editors and AI-powered coding agents.

Learn more at https://agentclientprotocol.com

## Installation

```bash
npm install @agentclientprotocol/sdk
```

## Experimental ACP v2

> **Warning:** ACP v2 is still a draft. Its wire protocol and this TypeScript
> API may change incompatibly in any SDK release. Use it only if you are
> prepared to track the draft as it evolves.

The stable package entry point remains ACP v1. ACP v2 requires an explicit
experimental import:

```ts
import * as acp from "@agentclientprotocol/sdk/experimental/v2";
```

Browse the [experimental v2 TypeScript API reference](https://agentclientprotocol.github.io/typescript-sdk/v2/)
and the [draft ACP v2 protocol documentation](https://agentclientprotocol.com/protocol/v2/draft/overview)
for the current SDK and protocol designs.

## Get Started

### Understand the Protocol

Start by reading the [official ACP documentation](https://agentclientprotocol.com) to understand the core concepts and protocol specification.

### Try the Examples

The [examples directory](https://github.com/agentclientprotocol/typescript-sdk/tree/main/src/examples) contains simple implementations of both Agents and Clients in TypeScript. These examples can be run from your terminal or from an ACP Client like [Zed](https://zed.dev), making them great starting points for your own integration!

### Explore the API

Browse the [TypeScript library reference](https://agentclientprotocol.github.io/typescript-sdk) for detailed API documentation.

If you're building an [Agent](https://agentclientprotocol.com/protocol/overview#agent), start with `agent({ name })`, register handlers such as `initialize(...)`, `newSession(...)`, and `prompt(...)`, then call `connect(stream)`.

If you're building a [Client](https://agentclientprotocol.com/protocol/overview#client), start with `client({ name })`, register client-side handlers such as `requestPermission(...)` and `sessionUpdate(...)`, then run your agent workflow with `connectWith(stream, async (ctx) => ...)`.

### Study a Production Implementation

For a complete, production-ready implementation, check out the [Gemini CLI Agent](https://github.com/google-gemini/gemini-cli/blob/main/packages/cli/src/zed-integration/zedIntegration.ts).

## Resources

- [Library docs](https://agentclientprotocol.github.io/typescript-sdk)
- [Examples](https://github.com/agentclientprotocol/typescript-sdk/tree/main/src/examples)
- [Protocol Documentation](https://agentclientprotocol.com)
- [GitHub Repository](https://github.com/agentclientprotocol/typescript-sdk)
- [NPM Package](https://www.npmjs.com/package/@agentclientprotocol/sdk)

## Contributing

See the main [repository](https://github.com/agentclientprotocol/typescript-sdk) for contribution guidelines.

### License

By contributing, you agree that your contributions will be licensed under the Apache 2.0 License.
