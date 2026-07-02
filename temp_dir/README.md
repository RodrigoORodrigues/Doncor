# Here are your Instructions


## Frontend troubleshooting (build)

If you see build errors caused by stale local state (for example duplicated declarations after bad merges), run:

```bash
npm run reinstall:frontend
npm run build:frontend
```

This forces a clean frontend dependency install before building.
