# ChiRho Events Public Assets

## Logo Files Required

This folder needs the following logo files from the "ChiRho Event Logos" folder in your GitHub repository:

### Required Files:

1. **logo-horizontal.png** (Full logo with text - for landing page header)
   - Source: "CHIRHO event full.png" from ChiRho Event Logos folder
   - Usage: Landing page navigation (top left corner)
   - Also used in email templates
   - Recommended size: ~200px width

2. **logo-square.png** (Optional - Circle graphic logo)
   - Source: Square logo files from ChiRho Event Logos folder
   - Usage: Email templates, favicons, social media
   - Recommended size: 512x512px

### How to Add Logos:

1. Copy the logo files from "ChiRho Event Logos" folder
2. Place them in this `/public/` directory
3. Rename them to match the names above:
   - "CHIRHO event full.png" → `logo-horizontal.png`
   - Square logo → `logo-square.png` (optional)

### Current Logo Usage:

- **Landing Page Header**: `/logo-horizontal.png` (clickable, links to homepage)
- **Email Templates**: Both check payment and credit card confirmation emails use `/logo-horizontal.png`
- **Recommended Format**: PNG with transparent background
- **Fallback**: If logo is missing, the site will show alt text "ChiRho Events"

### Note:

The application is currently configured to look for these files. Once you add them to this folder, they will automatically appear on the landing page and in email templates.
