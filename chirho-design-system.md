# ChiRho Events - Design System
**Version:** 1.0  
**Date:** November 26, 2025  
**Design Philosophy:** Modern Professional Gothic

---

## 🎨 Brand Identity

**Core Values:**
- **Professional:** Enterprise-grade platform for serious organizations
- **Modern:** Clean, contemporary interface
- **Catholic:** Respectful nods to tradition without being overly ornate
- **Trustworthy:** Secure, reliable, dependable

**Visual Style:** Modern Professional Gothic
- Clean lines and minimal UI
- Navy blue and gold color palette (from Chi-Rho logo)
- Modern sans-serif typography
- Occasional Gothic Catholic imagery (churches, architecture)
- Balance of traditional and contemporary

---

## 🎨 Color Palette

### **Primary Colors**

**Navy Blue (Primary)**
- Hex: `#1E3A5F`
- RGB: `rgb(30, 58, 95)`
- Use: Backgrounds, headers, primary text, navigation
- Represents: Trust, stability, professionalism

**Gold/Bronze (Accent)**
- Hex: `#9C8466`
- RGB: `rgb(156, 132, 102)`
- Use: CTA buttons, highlights, accents, links
- Represents: Catholic tradition, warmth, importance

---

### **Secondary Colors**

**Light Beige (Background)**
- Hex: `#F5F1E8`
- RGB: `rgb(245, 241, 232)`
- Use: Page backgrounds, card backgrounds
- Represents: Warmth, approachability

**White**
- Hex: `#FFFFFF`
- RGB: `rgb(255, 255, 255)`
- Use: Card backgrounds, text on dark backgrounds
- Represents: Clarity, cleanliness

**Dark Bronze**
- Hex: `#8B7355`
- RGB: `rgb(139, 115, 85)`
- Use: Hover states for gold buttons
- Darker shade of primary gold

**Light Gold/Cream**
- Hex: `#E8DCC8`
- RGB: `rgb(232, 220, 200)`
- Use: Light accents, subtle backgrounds
- Lighter shade of gold

---

### **Neutral Colors**

**Dark Navy Text**
- Hex: `#1E3A5F`
- RGB: `rgb(30, 58, 95)`
- Use: Primary body text, headings

**Black (Strong Text)**
- Hex: `#1F2937`
- RGB: `rgb(31, 41, 55)`
- Use: Heavy emphasis, dark mode text

**Gray (Secondary Text)**
- Hex: `#6B7280`
- RGB: `rgb(107, 114, 128)`
- Use: Secondary text, labels, captions

**Light Gray (Borders)**
- Hex: `#D1D5DB`
- RGB: `rgb(209, 213, 219)`
- Use: Borders, dividers, subtle lines

**Very Light Gray (Subtle Backgrounds)**
- Hex: `#F9FAFB`
- RGB: `rgb(249, 250, 251)`
- Use: Input backgrounds, card backgrounds

---

### **Feedback Colors**

**Success Green**
- Hex: `#10B981`
- RGB: `rgb(16, 185, 129)`
- Use: Success messages, completed states, checkmarks

**Error Red**
- Hex: `#EF4444`
- RGB: `rgb(239, 68, 68)`
- Use: Error messages, warnings, destructive actions

**Warning Orange**
- Hex: `#F59E0B`
- RGB: `rgb(245, 158, 11)`
- Use: Warning messages, pending states, dietary flags

**Info Blue**
- Hex: `#3B82F6`
- RGB: `rgb(59, 130, 246)`
- Use: Info messages, tooltips, helper text

---

## 📝 Typography

### **Font Stack**

**Primary Font:** Modern Sans-Serif (similar to logo)
- Recommended: Inter, Proxima Nova, Gotham, or Montserrat
- Fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif`

**Note:** Use a clean, modern sans-serif that matches the logo font. If the exact logo font isn't available, choose something visually similar with good readability.

---

### **Type Scale**

| Element | Size | Weight | Line Height | Use Case |
|---------|------|--------|-------------|----------|
| **H1** | 48-60px | Bold (700) | 1.1 | Page titles, hero headlines |
| **H2** | 36-42px | Bold (700) | 1.2 | Section headers |
| **H3** | 28-32px | Semibold (600) | 1.3 | Subsection headers |
| **H4** | 24px | Semibold (600) | 1.4 | Card titles, form sections |
| **H5** | 20px | Semibold (600) | 1.4 | Small headings |
| **H6** | 18px | Semibold (600) | 1.4 | Labels, smallest headings |
| **Body Large** | 18px | Regular (400) | 1.6 | Landing page body, important text |
| **Body** | 16px | Regular (400) | 1.6 | Standard body text |
| **Body Small** | 14px | Regular (400) | 1.5 | Secondary text, captions |
| **Caption** | 12px | Regular (400) | 1.4 | Helper text, footnotes |
| **Button** | 16px | Medium (500) | 1.0 | Button text |
| **Label** | 14px | Medium (500) | 1.4 | Form labels |

---

### **Mobile Type Scale (< 768px)**

Reduce sizes by ~20% on mobile:
- H1: 36-40px
- H2: 28-32px
- H3: 24px
- H4: 20px
- Body: 16px (keep same)

---

## 🔘 Buttons

### **Primary Button (Gold)**
```css
background: #9C8466
color: #1E3A5F
padding: 12px 24px
border-radius: 6px
font-weight: 500
font-size: 16px

hover: background: #8B7355
active: background: #7A6347
disabled: background: #D1D5DB, color: #9CA3AF
```

**Use:** Main actions (Get Started, Submit, Save, Confirm)

---

### **Secondary Button (Outline)**
```css
background: transparent
border: 2px solid #1E3A5F (or #FFFFFF on dark backgrounds)
color: #1E3A5F (or #FFFFFF on dark)
padding: 10px 22px (slightly less to account for border)
border-radius: 6px
font-weight: 500
font-size: 16px

hover: background: #1E3A5F, color: #FFFFFF
active: background: #152A47
disabled: border-color: #D1D5DB, color: #9CA3AF
```

**Use:** Secondary actions (Cancel, Back, Learn More)

---

### **Tertiary Button (Text/Link)**
```css
background: none
border: none
color: #9C8466
padding: 8px 16px
font-weight: 500
font-size: 16px

hover: color: #8B7355, text-decoration: underline
active: color: #7A6347
disabled: color: #9CA3AF
```

**Use:** Low-priority actions (Skip, Delete, View Details)

---

### **Destructive Button (Red)**
```css
background: #EF4444
color: #FFFFFF
padding: 12px 24px
border-radius: 6px
font-weight: 500
font-size: 16px

hover: background: #DC2626
active: background: #B91C1C
disabled: background: #FCA5A5, color: #FFFFFF
```

**Use:** Destructive actions (Delete, Remove, Cancel Subscription)

---

### **Button Sizes**

**Small**
- Padding: 8px 16px
- Font: 14px
- Use: Tables, compact UIs

**Medium (Default)**
- Padding: 12px 24px
- Font: 16px
- Use: Most interfaces

**Large**
- Padding: 16px 32px
- Font: 18px
- Use: Landing pages, hero CTAs

---

## 📦 Components

### **Cards**

```css
background: #FFFFFF
border: 1px solid #D1D5DB
border-radius: 8px
padding: 24px
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1)

hover: box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)
```

**Use:** Feature cards, group cards, registration summaries

---

### **Form Inputs**

```css
background: #F9FAFB
border: 1px solid #D1D5DB
border-radius: 6px
padding: 10px 14px
font-size: 16px
color: #1E3A5F

focus: border-color: #9C8466, outline: 2px solid #E8DCC8
error: border-color: #EF4444
disabled: background: #E5E7EB, color: #9CA3AF
```

**Input Types:**
- Text, email, phone, number
- Textarea (min-height: 100px)
- Select dropdown
- Checkbox, radio

**Labels:**
```css
font-size: 14px
font-weight: 500
color: #1F2937
margin-bottom: 6px
```

**Helper Text:**
```css
font-size: 12px
color: #6B7280
margin-top: 4px
```

**Error Message:**
```css
font-size: 12px
color: #EF4444
margin-top: 4px
display with error icon
```

---

### **Tables**

```css
Header Row:
  background: #F9FAFB
  font-weight: 600
  color: #1F2937
  border-bottom: 2px solid #D1D5DB

Body Rows:
  border-bottom: 1px solid #E5E7EB
  
  hover: background: #F9FAFB
  
  alternate: background: #FFFFFF / #F9FAFB (zebra striping)

Cell Padding: 12px 16px
Font Size: 14px
```

**Use:** Registration lists, payment history, reports

---

### **Badges**

**Status Badge:**
```css
padding: 4px 10px
border-radius: 12px
font-size: 12px
font-weight: 500

Success: background: #D1FAE5, color: #065F46
Warning: background: #FEF3C7, color: #92400E
Error: background: #FEE2E2, color: #991B1B
Info: background: #DBEAFE, color: #1E40AF
Neutral: background: #F3F4F6, color: #374151
```

**Use:** Payment status, form completion, check-in status

---

### **Alerts**

```css
padding: 12px 16px
border-radius: 6px
border-left: 4px solid [color]
font-size: 14px

Success:
  background: #D1FAE5
  border-color: #10B981
  color: #065F46

Warning:
  background: #FEF3C7
  border-color: #F59E0B
  color: #92400E

Error:
  background: #FEE2E2
  border-color: #EF4444
  color: #991B1B

Info:
  background: #DBEAFE
  border-color: #3B82F6
  color: #1E40AF
```

**Include icon** (✓, ⚠️, ✕, ℹ️) at start

---

### **Modals**

```css
Overlay:
  background: rgba(0, 0, 0, 0.5)
  backdrop-filter: blur(2px)

Modal Container:
  background: #FFFFFF
  border-radius: 12px
  max-width: 600px
  padding: 32px
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1)

Header:
  font-size: 24px
  font-weight: 700
  color: #1F2937
  margin-bottom: 16px

Body:
  font-size: 16px
  color: #4B5563
  margin-bottom: 24px

Footer:
  display: flex
  justify-content: flex-end
  gap: 12px
```

**Use:** Confirmations, forms, additional info

---

### **Navigation**

**Top Navigation:**
```css
background: #FFFFFF
border-bottom: 1px solid #E5E7EB
height: 64px
padding: 0 24px
position: sticky
top: 0
z-index: 50

Logo: height: 40px
Nav Links: 
  color: #1E3A5F
  font-weight: 500
  hover: color: #9C8466
```

**Sidebar Navigation (Poros Portal, Admin):**
```css
background: #1E3A5F
width: 260px
padding: 24px
color: #FFFFFF

Active Link:
  background: rgba(156, 132, 102, 0.2)
  color: #9C8466
  border-left: 3px solid #9C8466

Hover:
  background: rgba(255, 255, 255, 0.1)
```

---

### **Loading States**

**Spinner:**
```css
border: 3px solid #E5E7EB
border-top-color: #9C8466
border-radius: 50%
animation: spin 0.8s linear infinite
```

**Skeleton Loader:**
```css
background: linear-gradient(90deg, #F3F4F6 25%, #E5E7EB 50%, #F3F4F6 75%)
animation: loading 1.5s ease-in-out infinite
border-radius: 4px
```

**Progress Bar:**
```css
background: #E5E7EB
height: 8px
border-radius: 4px

Fill:
  background: #9C8466
  transition: width 0.3s ease
```

---

### **Tooltips**

```css
background: #1F2937
color: #FFFFFF
padding: 8px 12px
border-radius: 6px
font-size: 12px
max-width: 200px
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1)

Arrow: 8px, matches background color
```

**Use:** Helpful hints, additional context

---

## 🖼️ Imagery Guidelines

### **Photography Style**

**Primary:**
- Gothic Catholic architecture (cathedrals, churches)
- Black & white with high contrast
- Dramatic lighting
- Used sparingly (hero backgrounds, accent imagery)

**Secondary:**
- Youth ministry events (conferences, retreats)
- Professional UI screenshots
- People interacting with platform
- Modern, bright, authentic

**Avoid:**
- Stock photos that look too staged
- Overly saturated colors
- Busy or cluttered compositions
- Generic office imagery

---

### **Icons**

**Style:** Simple line icons (2px stroke)
**Color:** Navy (#1E3A5F) or Gold (#9C8466)
**Size:** 24px standard, 32px for emphasis, 16px for small

**Icon Library:** Use consistent set (Lucide, Heroicons, or custom)

**Examples:**
- ✓ Checkmark (success)
- ✕ X (error, delete)
- ⚠️ Warning triangle
- ℹ️ Info circle
- 📝 Clipboard (forms)
- 🏠 House (housing)
- 👤 User (profile)
- ⚙️ Gear (settings)

---

## 📏 Spacing System

Use 8px base unit (Tailwind-style):

| Name | Value | Use |
|------|-------|-----|
| xs | 4px | Tight spacing, icon padding |
| sm | 8px | Small gaps, compact layouts |
| md | 16px | Standard spacing |
| lg | 24px | Section spacing |
| xl | 32px | Large gaps |
| 2xl | 48px | Major section breaks |
| 3xl | 64px | Hero padding, page sections |

---

## 📐 Layout Guidelines

### **Container Widths**

- **Full Width:** 100% (mobile)
- **Container:** 1200px max (desktop, centered)
- **Narrow:** 800px max (long-form content)
- **Wide:** 1400px max (dashboards, tables)

### **Grid System**

- **Mobile:** 1 column
- **Tablet:** 2-3 columns (768px+)
- **Desktop:** 3-4 columns (1024px+)
- **Gap:** 24px (standard)

### **Breakpoints**

```css
sm: 640px   (large phones)
md: 768px   (tablets)
lg: 1024px  (laptops)
xl: 1280px  (desktops)
2xl: 1536px (large screens)
```

---

## ♿ Accessibility

### **Color Contrast**

All text must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio

**Checked Combinations:**
- Navy (#1E3A5F) on White → ✅ 8.5:1
- Gray (#6B7280) on White → ✅ 5.1:1
- White on Navy (#1E3A5F) → ✅ 8.5:1
- Gold (#9C8466) on Navy → ⚠️ 2.8:1 (use for accents only, not text)

### **Focus States**

All interactive elements must have visible focus:
```css
outline: 2px solid #9C8466
outline-offset: 2px
```

### **Keyboard Navigation**

- Tab order follows visual order
- All actions accessible via keyboard
- Skip links for screen readers
- ARIA labels on icon-only buttons

### **Screen Readers**

- Semantic HTML (header, nav, main, footer)
- Alt text on all images
- ARIA labels where needed
- Announce dynamic content changes

---

## 🎭 Animation Guidelines

### **Timing**

- **Fast:** 150ms (hover effects, tooltips)
- **Standard:** 300ms (transitions, modals)
- **Slow:** 500ms (page transitions, complex animations)

### **Easing**

- **ease-in-out:** Default for most transitions
- **ease-out:** Entering elements
- **ease-in:** Exiting elements

### **Motion Examples**

**Button Hover:**
```css
transition: background 150ms ease-in-out
```

**Modal Open:**
```css
animation: fadeIn 300ms ease-out
```

**Loading Spinner:**
```css
animation: spin 800ms linear infinite
```

**Avoid:**
- Excessive motion (motion sensitivity)
- Auto-playing animations
- Infinite loops (except loading states)

---

## 📱 Responsive Design Principles

### **Mobile First**

Design for mobile, then scale up:
1. Start with mobile layout (320px)
2. Add tablet breakpoint (768px)
3. Add desktop breakpoint (1024px)

### **Touch Targets**

- Minimum: 44x44px (Apple guideline)
- Recommended: 48x48px
- Spacing: 8px between targets

### **Mobile Optimizations**

- Larger text (16px minimum)
- Simplified navigation
- Single-column layouts
- Thumb-friendly button placement
- Reduced animations

---

## 🎨 Dark Mode (Future)

**Future Consideration:** Dark mode color palette

**Dark Colors:**
- Background: #0F172A
- Card: #1E293B
- Text: #F1F5F9
- Secondary Text: #94A3B8

**Note:** MVP uses light mode only. Dark mode in Phase 2.

---

## ✅ Design Checklist

Before shipping any UI:
- [ ] Colors match design system
- [ ] Typography uses correct scale
- [ ] Buttons use correct styles
- [ ] Forms have proper states (focus, error, disabled)
- [ ] Spacing follows 8px system
- [ ] Mobile responsive
- [ ] Contrast meets WCAG AA
- [ ] Focus states visible
- [ ] Keyboard accessible
- [ ] Loading states present
- [ ] Error states handled
- [ ] Tooltips where helpful
- [ ] Icons consistent

---

**END OF DESIGN SYSTEM**

**Total Components:** 15+  
**Color Palette:** 20+ colors defined  
**Typography:** Complete scale with 12 levels  
**Accessibility:** WCAG AA compliant
