# Website agent guide

Read [README.md](README.md) for the repository layout and commands. Writing lives
in `content/`; the Astro app is in `site/`. The separate Matt Obsidian vault is for
planning and is not automatically published here.

- For article creation or editing, read [site/AUTHORING.md](site/AUTHORING.md).
- For embedded tools, read [site/TOOL-ARTICLES.md](site/TOOL-ARTICLES.md), including
  its validation commands and the Tools repo's shared contract before changing code.
  Ordinary examples require content changes only. Tool schemas and codecs belong in
  Tools; refresh `site/src/lib/tool-contract/` with `sync:tool-contract`, never edit
  generated files or add per-tool website branches.
- Before shipping, read [site/PUBLISHING.md](site/PUBLISHING.md) and
  [site/HOSTING.md](site/HOSTING.md). Production is branch `v5`, not `main`.
- Keep unfinished articles as drafts. Preserve published slugs and example snapshots.
- Use explicit `--repo MatthewGarner/website` with `gh`: this checkout is a fork,
  and GitHub CLI can otherwise select upstream Quartz.
