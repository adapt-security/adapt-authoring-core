# adapt-authoring-core

The foundation of the Adapt authoring tool: the `App` singleton, the module loader, and the `AbstractModule` / `AbstractApiModule` base classes every other module extends. It also bundles the cross-cutting primitives modules rely on — hooks, error handling, and the request/response lifecycle.

This is a `module: false` package (it isn't a runtime application module itself) — it's the shared library the rest of the stack is built on.

## Documentation

The canonical project-wide guides live here and are surfaced in the generated docs site:

- [Writing a module](docs/writing-a-module.md) — the module pattern, conventions, and the branch/commit/release workflow (**start here**)
- [Contributing code](docs/contributing-code.md) — linting and the code standards every PR must meet
- [Hooks](docs/hooks.md) · [Error handling](docs/error-handling.md) — core concepts
- [Folder structure](docs/folder-structure.md) · [Configure environment](docs/configure-environment.md) — getting started
- [Customising](docs/customising.md) · [Writing tests](docs/writing-tests.md) — development
- [Developer workflow](docs/developer-workflow.md) · [Releasing](docs/releasing.md) — contributing
