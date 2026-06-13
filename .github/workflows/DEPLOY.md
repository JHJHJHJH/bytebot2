## Update Docker Images

Maintainers can manually rebuild and publish the `edge` Docker images with the
GitHub CLI:

```bash
gh workflow run build-desktop.yaml --repo JHJHJHJH/bytebot-han --ref main
gh workflow run build-agent.yaml --repo JHJHJHJH/bytebot-han --ref main
gh workflow run build-ui.yaml --repo JHJHJHJH/bytebot-han --ref main
gh workflow run build-docs.yaml --repo JHJHJHJH/bytebot-han --ref main
```

These commands require the workflow files to be committed to the repository's
default branch before GitHub can dispatch them.