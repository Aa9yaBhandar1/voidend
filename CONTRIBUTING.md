<samp>

# contributing

this is a way to contribute in project project so nothing too serious - just follow this so we don't break each other's work.

## workflow

**1. pull latest main first**

```
git pull origin main
```

**2. create a new branch for your changes**

```
git switch -c your-branch-name
```

**3. make your changes**

**4. before committing — run this**

```
pnpm check
```

fix whatever it complains about, then run

```
pnpm check:fix
```

to auto-fix formatting and lint issues. **don't skip this** — there's a CI pipeline and it will fail if your code has lint or formatting errors.

**5. commit and push**

```
git add .
git commit -m "describe what you changed"
git push origin your-branch-name
```

**6. open a pull request on github** to merge into `main`

**7. ask a team member to review it**

**8. once approved, merge it on github**

**9. delete the branch, start fresh for the next change**

## branch naming

keep it simple and descriptive

```
feat/add-login
fix/db-connection
chore/update-readme
```

## commit messages

use [conventional commits](https://www.conventionalcommits.org) format

```
type: short description
```

## the rule

> never push directly to `main`

always go through a branch + pull request. always.

</samp>
