# Bytebot Helm Charts

This directory contains Helm charts for deploying Bytebot on Kubernetes.

## Documentation

For complete deployment instructions, see:
**[Helm Deployment Guide](https://docs.bytebot.ai/deployment/helm)**

## Quick Start

```bash
# Clone repository
git clone https://github.com/bytebot-ai/bytebot.git
cd bytebot

# Create values.yaml with your API key(s)
cat > values.yaml <<EOF
bytebot-agent:
  apiKeys:
    anthropic:
      value: "sk-ant-your-key-here"
EOF

# Install
helm install bytebot ./helm --namespace bytebot --create-namespace -f values.yaml

# Access
kubectl port-forward -n bytebot svc/bytebot-ui 9992:9992
```

Access at: http://localhost:9992

## Optional UI Admin Login

Set both `bytebot-ui.auth.adminUser` and `bytebot-ui.auth.adminPassword`
to require a login before users can open the Bytebot web UI:

```yaml
bytebot-ui:
  auth:
    adminUser: "admin"
    adminPassword: "change-me"
```

For production, store these values in an existing Kubernetes Secret:

```yaml
bytebot-ui:
  auth:
    existingSecret: "bytebot-ui-auth"
    usernameKey: "admin-user"
    passwordKey: "admin-password"
```

## Structure

```
helm/
├── Chart.yaml              # Main chart
├── values.yaml             # Default values
├── values-proxy.yaml       # LiteLLM proxy configuration
├── templates/              # Kubernetes templates
└── charts/                 # Subcharts
    ├── bytebot-desktop/    # Desktop VNC service
    ├── bytebot-agent/      # Backend API service
    ├── bytebot-ui/         # Frontend UI service
    ├── bytebot-llm-proxy/  # Optional LiteLLM proxy
    └── postgresql/         # PostgreSQL database
```
