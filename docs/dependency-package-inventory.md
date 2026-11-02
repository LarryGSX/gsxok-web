# Package-level dependency review

Generated from the two retained npm audit reports. Counts include inherited package findings, not distinct exploitable CVEs. Read [review and exploit conditions](dependency-security-review.md) before interpreting these tables.

## All 53 original package findings

| Package | Before | After | Root advisory or inherited dependency |
| --- | --- | --- | --- |
| @architect/hydrate | high | No longer flagged | @architect/utils, glob |
| @architect/inventory | high | No longer flagged | @architect/utils |
| @architect/utils | high | No longer flagged | glob |
| @eslint-community/eslint-utils | moderate | moderate remains (see root-cause disposition) | eslint |
| @eslint/config-array | moderate | moderate remains (see root-cause disposition) | minimatch |
| @eslint/eslintrc | moderate | moderate remains (see root-cause disposition) | minimatch |
| @oclif/core | moderate | moderate remains (see root-cause disposition) | minimatch |
| @oclif/plugin-help | moderate | moderate remains (see root-cause disposition) | @oclif/core |
| @prisma/config | high | No longer flagged | deepmerge-ts |
| @react-email/render | low | low remains (see root-cause disposition) | html-to-text |
| @sanity/cli | high | moderate remains (see root-cause disposition) | @sanity/codegen, @sanity/runtime-cli, decompress |
| @sanity/codegen | high | No longer flagged | zod |
| @sanity/export | moderate | No longer flagged | archiver, rimraf |
| @sanity/import | moderate | No longer flagged | rimraf |
| @sanity/insert-menu | moderate | No longer flagged | @sanity/ui |
| @sanity/next-loader | moderate | No longer flagged | next |
| @sanity/preview-url-secret | moderate | No longer flagged | @sanity/uuid |
| @sanity/runtime-cli | high | moderate remains (see root-cause disposition) | @oclif/core, @oclif/plugin-help, adm-zip |
| @sanity/ui | moderate | No longer flagged | react-refractor |
| @sanity/uuid | moderate | No longer flagged | uuid |
| @sanity/vision | moderate | moderate remains (see root-cause disposition) | @sanity/ui |
| @sanity/visual-editing | moderate | No longer flagged | @sanity/preview-url-secret, @sanity/ui |
| @typescript-eslint/eslint-plugin | moderate | moderate remains (see root-cause disposition) | @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/utils, eslint |
| @typescript-eslint/parser | moderate | moderate remains (see root-cause disposition) | @typescript-eslint/typescript-estree, eslint |
| @typescript-eslint/type-utils | moderate | moderate remains (see root-cause disposition) | @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint |
| @typescript-eslint/typescript-estree | moderate | moderate remains (see root-cause disposition) | minimatch |
| @typescript-eslint/utils | moderate | moderate remains (see root-cause disposition) | @eslint-community/eslint-utils, @typescript-eslint/typescript-estree, eslint |
| adm-zip | high | No longer flagged | [adm-zip](https://github.com/advisories/GHSA-xcpc-8h2w-3j85), [adm-zip](https://github.com/advisories/GHSA-vwc7-r8mq-g2x9), [adm-zip](https://github.com/advisories/GHSA-7q85-xj36-vmfc), [adm-zip](https://github.com/advisories/GHSA-rcw4-f5rp-g42v), [adm-zip](https://github.com/advisories/GHSA-j5f4-cc29-5x44), [adm-zip](https://github.com/advisories/GHSA-p634-w6r4-rjp2), [adm-zip](https://github.com/advisories/GHSA-c6fg-446q-cg94), [adm-zip](https://github.com/advisories/GHSA-8238-w5pm-2374) |
| archiver | moderate | No longer flagged | readdir-glob |
| decompress | critical | No longer flagged | [decompress](https://github.com/advisories/GHSA-mp2f-45pm-3cg9), [decompress](https://github.com/advisories/GHSA-h39j-r5qq-r9mm), [decompress](https://github.com/advisories/GHSA-jwp9-9v96-94mx), [decompress](https://github.com/advisories/GHSA-hrh2-vp3x-79xf) |
| deepmerge | low | low remains (see root-cause disposition) | [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) |
| deepmerge-ts | high | No longer flagged | [deepmerge-ts](https://github.com/advisories/GHSA-ggr8-5vv4-36mx) |
| eslint | moderate | moderate remains (see root-cause disposition) | @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, minimatch |
| eslint-config-next | moderate | moderate remains (see root-cause disposition) | @typescript-eslint/eslint-plugin, @typescript-eslint/parser, eslint, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-react |
| eslint-plugin-import | moderate | moderate remains (see root-cause disposition) | minimatch |
| eslint-plugin-jsx-a11y | moderate | moderate remains (see root-cause disposition) | minimatch |
| eslint-plugin-react | moderate | moderate remains (see root-cause disposition) | minimatch |
| glob | high | No longer flagged | [glob](https://github.com/advisories/GHSA-5j98-mcp5-4vw2), [glob](https://github.com/advisories/GHSA-3g3m-2fjr-6pw4), minimatch |
| html-to-text | low | low remains (see root-cause disposition) | deepmerge |
| minimatch | moderate | moderate remains (see root-cause disposition) | [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| next | moderate | No longer flagged | postcss |
| next-sanity | moderate | moderate remains (see root-cause disposition) | @sanity/next-loader, @sanity/preview-url-secret, @sanity/ui, @sanity/visual-editing, next, sanity |
| postcss | high | No longer flagged | [postcss](https://github.com/advisories/GHSA-qx2v-qp2m-jg93), [postcss](https://github.com/advisories/GHSA-6g55-p6wh-862q), [postcss](https://github.com/advisories/GHSA-fxqj-rqcc-2cmp), [postcss](https://github.com/advisories/GHSA-r28c-9q8g-f849) |
| prisma | high | No longer flagged | @prisma/config |
| prismjs | moderate | No longer flagged | [prismjs](https://github.com/advisories/GHSA-x7hr-w5r2-h6wg) |
| react-refractor | moderate | No longer flagged | refractor |
| readdir-glob | moderate | No longer flagged | minimatch |
| refractor | moderate | No longer flagged | prismjs |
| resend | low | low remains (see root-cause disposition) | @react-email/render |
| rimraf | moderate | No longer flagged | glob |
| sanity | moderate | moderate remains (see root-cause disposition) | @sanity/cli, @sanity/export, @sanity/import, @sanity/preview-url-secret, @sanity/ui, archiver, react-refractor, refractor, rimraf |
| uuid | moderate | No longer flagged | [uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq) |
| zod | high | No longer flagged | [zod](https://github.com/advisories/GHSA-mrhx-c7xc-m3w5) |

## All current findings

| Package | Severity | Root advisory or inherited dependency |
| --- | --- | --- |
| @eslint-community/eslint-utils | moderate | eslint |
| @eslint/config-array | moderate | minimatch |
| @eslint/eslintrc | moderate | minimatch |
| @next/eslint-plugin-next | moderate | @eslint-community/eslint-utils |
| @oclif/core | moderate | minimatch |
| @oclif/plugin-help | moderate | @oclif/core |
| @oclif/plugin-not-found | moderate | @oclif/core |
| @react-email/render | low | html-to-text |
| @sanity-labs/oclif-plugin-skills-flag | moderate | @oclif/core |
| @sanity/blueprints | moderate | @sanity/cli-build |
| @sanity/cli | moderate | @oclif/core, @oclif/plugin-help, @oclif/plugin-not-found, @sanity/cli-build, @sanity/cli-core, @sanity/runtime-cli, @sanity/workbench-cli, @sanity/workflow-cli |
| @sanity/cli-build | moderate | @oclif/core, @sanity/cli-core, @sanity/workbench-cli, sanity |
| @sanity/cli-core | moderate | @oclif/core |
| @sanity/runtime-cli | moderate | @oclif/core, @oclif/plugin-help, @sanity-labs/oclif-plugin-skills-flag, @sanity/blueprints, @sanity/cli-build, @sanity/cli-core |
| @sanity/vision | moderate | sanity |
| @sanity/workbench-cli | moderate | @sanity/cli-core |
| @sanity/workflow-cli | moderate | @oclif/core, @oclif/plugin-help, @sanity/cli-core |
| @typescript-eslint/eslint-plugin | moderate | @typescript-eslint/parser, @typescript-eslint/type-utils, @typescript-eslint/utils, eslint |
| @typescript-eslint/parser | moderate | @typescript-eslint/typescript-estree, eslint |
| @typescript-eslint/type-utils | moderate | @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint |
| @typescript-eslint/typescript-estree | moderate | minimatch |
| @typescript-eslint/utils | moderate | @eslint-community/eslint-utils, @typescript-eslint/typescript-estree, eslint |
| deepmerge | low | [deepmerge](https://github.com/advisories/GHSA-gcqx-w48m-w2h4) |
| eslint | moderate | @eslint-community/eslint-utils, @eslint/config-array, @eslint/eslintrc, minimatch |
| eslint-config-next | moderate | @next/eslint-plugin-next, eslint, eslint-plugin-import, eslint-plugin-jsx-a11y, eslint-plugin-react, typescript-eslint |
| eslint-plugin-import | moderate | minimatch |
| eslint-plugin-jsx-a11y | moderate | minimatch |
| eslint-plugin-react | moderate | minimatch |
| html-to-text | low | deepmerge |
| minimatch | moderate | [minimatch](https://github.com/advisories/GHSA-g3hv-75wg-m249) |
| next-sanity | moderate | sanity |
| resend | low | @react-email/render |
| sanity | moderate | @sanity/cli |
| typescript-eslint | moderate | @typescript-eslint/eslint-plugin, @typescript-eslint/parser, @typescript-eslint/typescript-estree, @typescript-eslint/utils, eslint |
