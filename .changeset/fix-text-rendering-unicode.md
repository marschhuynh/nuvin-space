---
'@nuvin/nuvin-cli': patch
---

Fix text rendering and wrapping issues

- Fixed unicode character width calculations using string-width library
- Improved text reflow algorithm to properly handle indentation and ANSI codes
- Fixed input submission to preserve whitespace (don't trim user input)
- Added wrap="end" to Markdown component for better text wrapping
- Enabled markdown rendering for streaming content in MessageLine
- Added comprehensive text reflow tests
