# Builder.io Visual Editor Integration

This project integrates Builder.io visual editor for content management on harnosandshf.se. The `/editor` route provides a password-protected visual editing interface.

## 🚀 Quick Setup

### 1. Create Builder.io Account

1. Go to [builder.io](https://builder.io) and create a free account
2. Create a new organization or use the default one
3. Navigate to your Space Settings

### 2. Get Your API Key

1. In Builder.io dashboard, go to **Account** → **Organization** → **Space Settings**
2. Copy your **Public API Key** (starts with `pub-`)
3. Keep this key secure - you'll need it in the next step

### 3. Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder API key:

```env
# Builder.io Configuration
NEXT_PUBLIC_BUILDER_API_KEY=pub-your-actual-api-key-here

# Editor Protection (change this password!)
NEXT_PUBLIC_EDITOR_PASS=your-secure-password
```

### 4. Create Content Model

1. In Builder.io dashboard, go to **Models**
2. Click **+ New Model**
3. Choose **Page** model type
4. Name it "Page" or "Website Page"
5. Set the **URL field** to match your routes (use `/editor` for testing)

### 5. Create Your First Page

1. In Builder.io, click **Content** → **+ New Entry**
2. Select your Page model
3. Set the URL to `/editor`
4. Use the visual editor to add content:
   - Drag and drop components
   - Use the custom "Hero Section" component available in the right panel
   - Customize colors, text, and images
5. Click **Publish** when ready

## 🔧 Using the Editor

### Accessing the Editor

1. Start your development server: `npm run dev`
2. Navigate to `/editor` 
3. Enter the password you set in `NEXT_PUBLIC_EDITOR_PASS`
4. The page will load your Builder.io content

### Custom Components

The integration includes a custom **Hero Section** component with these editable fields:

- **Title**: Main heading text
- **Subtitle**: Supporting text below the title  
- **Background Image**: Hero background image
- **Primary Button**: Text and link for main CTA
- **Secondary Button**: Text and link for secondary CTA

### Visual Editing Workflow

1. **Edit in Builder.io**: Make changes in the Builder.io dashboard
2. **Preview**: Use Builder's preview mode to see changes
3. **Publish**: Click publish to make changes live
4. **View**: Refresh your `/editor` page to see updates

## 🛠️ Technical Details

### Files Created/Modified

- `app/editor/page.tsx` - Main editor page with auth and Builder integration
- `lib/builder.ts` - Builder.io configuration and custom components
- `app/api/builder/sample/route.ts` - Sample content API route
- `.env.local` - Environment variables for API key and password

### Dependencies Added

- `@builder.io/react` - Builder.io React SDK for content rendering

### Authentication

The `/editor` route is protected by a simple password prompt that stores authentication state in `sessionStorage`. Change the password in your environment variables for security.

## 📋 Content Management Workflow

### For Content Editors

1. **Login to Builder.io**: Access your Builder.io dashboard
2. **Find Your Content**: Go to Content tab and find your page
3. **Edit Visually**: Use drag-and-drop editor to modify content
4. **Preview Changes**: Use preview mode to test changes
5. **Publish**: Make changes live with one click

### For Developers

1. **Register New Components**: Add custom React components in `lib/builder.ts`
2. **Configure Fields**: Define editable properties for each component
3. **Test Locally**: Use `/editor` route to test integration
4. **Deploy**: Changes to components require code deployment

## 🔍 Troubleshooting

### "No Content Found" Message

- Ensure your API key is correct in `.env.local`
- Create a page in Builder.io with URL matching `/editor`
- Make sure the page is published in Builder.io

### Authentication Issues

- Check that `NEXT_PUBLIC_EDITOR_PASS` is set in `.env.local`
- Clear browser storage if having session issues
- Try incognito/private browsing mode

### Content Not Updating

- Check that changes are published in Builder.io (not just saved as draft)
- Refresh the `/editor` page after publishing
- Verify the correct API key is being used

### Builder.io Editor Not Loading

- Confirm your API key has the correct permissions
- Check browser console for any JavaScript errors
- Ensure internet connection for loading Builder.io assets

## 🌟 Next Steps

### Enhanced Security

- Replace simple password auth with proper authentication (NextAuth.js)
- Add role-based access control
- Use environment-specific API keys

### Advanced Features

- Add more custom components for your content needs
- Implement content scheduling and workflows
- Add SEO meta fields to your content model
- Connect Builder.io webhooks for instant updates

### Performance Optimization

- Implement content caching strategies
- Add image optimization for Builder.io assets
- Use Builder.io's edge delivery network features

## 📚 Resources

- [Builder.io Documentation](https://www.builder.io/c/docs)
- [Builder.io React SDK](https://github.com/BuilderIO/builder/tree/main/packages/react)
- [Builder.io Custom Components Guide](https://www.builder.io/c/docs/custom-components-intro)
- [Builder.io Content API](https://www.builder.io/c/docs/query-api)

## 🆘 Support

For Builder.io specific issues:
- [Builder.io Support](https://www.builder.io/c/docs)
- [Community Forum](https://forum.builder.io/)
- [GitHub Issues](https://github.com/BuilderIO/builder/issues)

For project-specific issues:
- Check the troubleshooting section above
- Review the browser console for error messages
- Verify environment variable configuration
