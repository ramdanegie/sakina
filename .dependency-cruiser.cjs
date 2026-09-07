/**
 * Architecture boundaries, enforced in CI.
 *
 * Clean Architecture only holds if the Dependency Rule is mechanically
 * checked. Without this, "domain must not import React" is folklore that
 * decays on the first busy afternoon.
 *
 * Allowed direction:
 *   app / components -> presentation -> application -> domain
 *   infrastructure -> application, domain
 *   presentation -> infrastructure ONLY through the DI container
 *
 * Note the trailing slashes in every path: `^src/app` without one also
 * matches `src/application`, which silently turns these rules into nonsense.
 */
module.exports = {
  forbidden: [
    {
      name: "domain-is-pure",
      severity: "error",
      comment:
        "The domain must not depend on any other layer. It is plain TypeScript.",
      from: { path: "^src/domain/" },
      to: {
        path: "^src/(application|infrastructure|presentation|app|components|lib)/",
      },
    },
    {
      name: "domain-no-npm",
      severity: "error",
      comment:
        "The domain must not depend on runtime packages — no React, no Dexie, no HTTP client.",
      from: { path: "^src/domain/" },
      to: { dependencyTypes: ["npm"] },
    },
    {
      name: "application-no-adapters",
      severity: "error",
      comment:
        "The application layer defines ports; it must never reference a concrete adapter or any UI.",
      from: { path: "^src/application/" },
      to: { path: "^src/(infrastructure|presentation|app|components)/" },
    },
    {
      name: "pages-no-direct-domain",
      severity: "error",
      comment:
        "Route components must go through presentation hooks/stores, not reach into the domain.",
      from: { path: "^src/app/" },
      to: { path: "^src/domain/" },
    },
    {
      name: "infrastructure-only-via-di",
      severity: "error",
      comment:
        "Presentation may only touch infrastructure through the DI container (the composition root).",
      from: { path: "^src/(app|components)/" },
      to: {
        path: "^src/infrastructure/",
        pathNot: "^src/infrastructure/di/",
      },
    },
    {
      name: "no-circular",
      severity: "error",
      comment: "Circular dependencies make layering meaningless.",
      from: {},
      to: { circular: true },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.test\\.ts$" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".js", ".jsx", ".ts", ".tsx"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
