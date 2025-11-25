---
'@nuvin/nuvin-cli': patch
---

Validate provider authentication in models command

- Check provider auth configuration before allowing model selection
- Show helpful error message prompting users to run /auth if provider not configured
- Prevent saving invalid provider/model configurations
- Fix isActive prop forwarding in ModelsCommandComponent
