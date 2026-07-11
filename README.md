<samp>

# voidend

## setup

```
git clone https://github.com/Gr1shma/voidend/
cd voidend
pnpm install
pnpm db:push
```

## dev

```
pnpm dev
```

## data directory

voidend stores its database and mock data in:

| platform | path                                     |
| -------- | ---------------------------------------- |
| linux    | `~/.local/share/voidend/`                |
| macOS    | `~/Library/Application Support/voidend/` |
| windows  | `%APPDATA%\voidend\`                     |

## structure

```
src/
├── app/        next.js routes and pages
├── components/ shared ui components
├── hooks/      react query hooks
├── lib/        data store and schema utilities
├── modules/    feature modules (projects, workspace)
├── server/     trpc routers and db
├── trpc/       client and server trpc setup
└── styles/     global css
```

## scripts

| command            | does                            |
| ------------------ | ------------------------------- |
| `pnpm dev`         | start dev server with turbopack |
| `pnpm check`       | lint and format                 |
| `pnpm check:fix`   | lint + autofix + format         |
| `pnpm db:generate` | generate migrations             |
| `pnpm db:migrate`  | apply migrations                |
| `pnpm db:push`     | push schema changes to db       |
| `pnpm db:studio`   | open drizzle studio             |
| `pnpm typecheck`   | run typescript checks           |

contributing? read [CONTRIBUTING.md](./CONTRIBUTING.md) first.

</samp>
