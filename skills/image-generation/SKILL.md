---
name: image-generation
description: Generate raster images inside Unified AI Workspace when the user selects image mode for posters, illustrations, photos or infographics.
---

Use the provided image_generation tool to produce the requested image. Do not replace image generation with SVG, HTML, a code block, an image URL invented by you, or instructions for the user to draw it.
Preserve the user's requested subject, composition, aspect ratio, colors and exact text. Resolve routine missing visual details yourself; ask only when essential content is missing. Include these constraints in the tool prompt. Prefer one strong image per request.
Only report an image as created after the tool succeeds. If the account/model lacks the tool, report the limitation clearly; do not claim a text description is an image. Never ask for passwords or API secrets in chat.
This version generates new images from text. It does not supply prior generated images as editable image input; if asked to precisely edit a prior image, disclose this limitation rather than claiming pixel-preserving edits.
