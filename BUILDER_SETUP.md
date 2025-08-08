# Builder.io Editor Setup

The `/editor` page has been configured to work with Builder.io for content management.

## Configuration

1. **Environment Variable**: Set `NEXT_PUBLIC_BUILDER_PUBLIC_KEY` to your actual Builder.io public API key
2. **Model**: The page uses the "page" model from Builder.io
3. **Protection**: The route is protected by Cloudflare Access (configured in middleware.ts)

## Features

- Loads content from Builder.io "page" model
- Renders a sample hero section with customizable fields:
  - Title
  - Subtitle  
  - Button text and link
  - Background image
- Fallback content if no Builder.io content is found
- Error handling for missing API key

## Access

The `/editor` route is protected by Cloudflare Access. Users must authenticate through Cloudflare Access to view the editor.

## Builder.io Integration

The page includes:
- Builder.io React SDK integration
- Custom Hero component registered with Builder.io
- Automatic content fetching from Builder.io
- Fallback sample content for development

To use with actual Builder.io content:
1. Set up your Builder.io space
2. Create a "page" model
3. Add content for the `/editor` URL
4. Update the `NEXT_PUBLIC_BUILDER_PUBLIC_KEY` environment variable
