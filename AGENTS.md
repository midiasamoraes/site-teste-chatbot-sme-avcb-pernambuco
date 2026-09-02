# AGENTS.md - Sá Moraes AVCB Site

## Development
- **View site**: Open `index.html` in any browser
- **Edit content**: Modify the HTML file directly (CSS/JS are embedded)
- **No build step**: Static site, changes visible immediately on refresh

## Key Workflow Notes
- **MOCK placeholders**: Look for elements with class="mock" or containing "MOCK" text - these must be replaced with real data before publishing
- **Contact links**: WhatsApp URLs in `<a href="https://wa.me/...">` use phone number 5581997460029
- **Analytics**: Google Analytics ID `G-MOCK000000` in scripts needs replacing with real ID
- **Images**: All assets are local files in the same directory

## Content Sections Requiring Review Before Publish
1. **Mock banner** (line 235): Internal draft notice
2. **Technical data** (line 266): CREA-PE and responsible engineer info
3. **Process timelines** (lines 314, 318, 322): Mock durations for diagnostic/project/vistoria
4. **Service areas** (lines 381-388): Example city list needing verification
5. **Testimonial** (lines 400-402): Fictitious client quote
6. **Footer contact** (lines 446, 454): Phone, email, address, CNPJ, CREA
7. **Analytics ID** (line 463): Replace G-MOCK000000 with real GA4 ID

## Maintenance
- Test responsive behavior at common breakpoints: 320px, 640px, 768px, 900px, 1200px
- Validate all links (especially WhatsApp) before publishing
- Check image optimization - all should be web-optimized already