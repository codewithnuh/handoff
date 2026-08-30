# Task: Build a Realistic Interactive SaaS Workflow Demo for the Landing Page

You are working inside my existing SaaS codebase.

Your job is to **analyze my existing dashboard/UI implementation first**, then create a polished, realistic **workflow/product-demo animation** for the landing page that looks like a real user session being recorded.

This must NOT be a generic mock dashboard.

The demo should visually reuse and accurately reflect my **actual dashboard design system, colors, spacing, typography, sidebar, cards, buttons, icons, and UI patterns**.

---

## 1. FIRST: Analyze the Existing Application

Before writing the demo, inspect the codebase carefully.

Find and understand:

* The main dashboard page
* Dashboard layout
* Sidebar
* Header/top navigation
* Dashboard cards
* Tables/lists
* Buttons
* Forms
* Modals/dialogs
* Dropdowns
* Inputs
* Icons
* Typography
* Color tokens
* Tailwind configuration
* CSS variables
* Theme/dark-mode implementation
* Existing reusable UI components
* Existing shadcn/ui components
* Existing animations
* Existing Motion/Framer Motion usage
* Existing spacing and border-radius conventions

Do NOT recreate UI styles from memory.

Reuse existing components wherever practical.

If the dashboard already has components such as:

* `Sidebar`
* `DashboardHeader`
* `ProjectCard`
* `TaskList`
* `Dialog`
* `Button`
* `Input`
* `Avatar`
* `Badge`

then use those components or compose them rather than creating visually inconsistent replacements.

The goal is that someone looking at the landing-page demo should immediately recognize:

> "This is the actual product."

---

# 2. Goal

Create a **self-running SaaS workflow demonstration** for the landing page.

It should look similar to a high-quality product walkthrough / session replay.

It should feel like:

> A real person is using the actual SaaS application.

The demo should NOT look like:

* a static screenshot
* a GIF
* a video
* a generic fake dashboard
* a cursor moving randomly over a static UI

Instead, it should be:

> Real React/HTML UI + real components + animated state changes + animated cursor + realistic workflow.

All visible text should remain real DOM text whenever possible.

The user should be able to select/copy text inside the demo.

Do NOT use an MP4, GIF, canvas recording, or screenshot as the main implementation.

---

# 3. Demo Size

The workflow demo should occupy approximately:

* 50–70% of the visible landing-page viewport width
* Preferably around 60%
* Responsive on mobile
* Large enough that users can clearly see the actual product UI

Do not make it unnecessarily huge.

It should look like a premium product showcase.

Example:

```text
        Landing Page

   headline
   supporting copy

        ┌─────────────────────────────────────┐
        │                                     │
        │         ACTUAL PRODUCT UI           │
        │                                     │
        │         Workflow animation          │
        │                                     │
        └─────────────────────────────────────┘
```

The dashboard can be:

* full-width inside the demo
* or approximately half/full product viewport depending on what looks best

Choose the composition based on the actual dashboard.

---

# 4. Use the REAL Dashboard Visual Language

This is extremely important.

Do not invent colors.

Use the existing application's:

* background colors
* sidebar background
* primary color
* secondary color
* muted colors
* border colors
* text colors
* destructive colors
* success colors
* accent colors
* button styles
* shadows
* radius
* typography

If the application uses CSS variables such as:

```css
--background
--foreground
--primary
--secondary
--muted
--border
--accent
```

reuse them.

If the dashboard is dark mode, preserve the actual dark dashboard colors.

If it is light mode, preserve the actual light colors.

Do not create an unrelated "pretty SaaS dashboard."

The landing-page demo should look like the actual application.

---

# 5. Create an ACTUAL Workflow

Do not just animate the cursor.

Create a believable workflow using the real dashboard UI.

For example, if the SaaS is project/task/team based:

```text
1. Dashboard loads

2. Cursor appears

3. Cursor moves toward "New Project"

4. Cursor pauses briefly

5. Button receives hover state

6. Cursor clicks

7. Actual modal/dialog opens

8. Cursor moves to the project-name input

9. Input receives focus

10. Text is typed character-by-character

11. Cursor moves to "Create"

12. Button receives hover/pressed state

13. Cursor clicks

14. Modal closes

15. New project appears in the dashboard

16. Dashboard count/stat updates

17. Sidebar/project list updates

18. Recent activity updates

19. Workflow pauses

20. Demo resets smoothly

21. Workflow starts again
```

The exact workflow should be adapted to what my SaaS actually does.

---

# 6. IMPORTANT: Make the UI React State Driven

The animation should be based on actual React state.

For example:

```tsx
type DemoStep =
  | "dashboard"
  | "hover-create"
  | "open-modal"
  | "focus-input"
  | "typing"
  | "hover-submit"
  | "submit"
  | "complete";
```

Use state to control the UI.

For example:

```tsx
const [step, setStep] = useState<DemoStep>("dashboard");
```

The UI should actually change when the workflow progresses.

Do NOT create a static dashboard and move a cursor over it.

---

# 7. Cursor

Create a polished animated cursor.

The cursor should:

* move naturally
* have realistic easing
* pause before important interactions
* visually indicate clicking
* optionally have a subtle name/label
* scale slightly on click
* move to actual UI elements

Example:

```tsx
<motion.div
  animate={{
    x: cursorX,
    y: cursorY,
  }}
  transition={{
    duration: 0.7,
    ease: [0.22, 1, 0.36, 1],
  }}
>
  <Cursor />
</motion.div>
```

Do not make the cursor movement robotic.

Use pauses and realistic timing.

---

# 8. Use Motion

Use the project's existing animation library if one exists.

If the project already uses Motion, use:

```tsx
import {
  motion,
  AnimatePresence,
  useAnimate,
} from "motion/react";
```

If it uses another animation system, follow the existing project architecture.

Do not introduce another animation library unnecessarily.

Animations should feel:

* smooth
* subtle
* premium
* deliberate

Avoid excessive bouncing.

Prefer:

```text
easeOut
easeInOut
spring with low bounce
```

over exaggerated animations.

---

# 9. Typing Animation

If the workflow contains an input, make the text appear character-by-character.

For example:

```text
W
We
Web
Webs
Websi
Websit
Website
Website r
Website re
...
```

The input must be an actual HTML input.

Do not render fake text over an input.

Example:

```tsx
<input
  value={projectName}
  readOnly
  className="..."
/>
```

Then update the value during the workflow.

---

# 10. Real UI State Changes

When the workflow completes an action, the dashboard must visibly respond.

For example:

Before:

```text
Projects     12
```

After:

```text
Projects     13
```

Before:

```text
Mobile App
Marketing
```

After:

```text
Website Redesign
Mobile App
Marketing
```

Before:

```text
Recent activity
```

After:

```text
Alex created Website Redesign
```

These should be actual React state changes.

Use:

```tsx
<AnimatePresence>
```

for elements entering/leaving.

---

# 11. Reuse Existing Components

Prioritize existing components.

For example:

```tsx
<Sidebar />
<Button />
<Input />
<Dialog />
<Card />
<Badge />
```

If directly reusing the actual dashboard component is practical, do it.

If the full dashboard is too complex for the landing-page demo, create a lightweight demo-specific composition using the **same components and styles**.

Do not duplicate huge amounts of dashboard code unnecessarily.

---

# 12. The Demo Should Look Like a Recorded Workflow

The visual composition should communicate:

> "Watch how easy this product is to use."

The workflow should have a clear beginning, middle, and end.

Example timing:

```text
0.0s    Dashboard visible
1.0s    Cursor appears
1.3s    Cursor moves to action
2.0s    Hover
2.2s    Click
2.5s    Modal opens
3.0s    Input focus
3.2s    Typing starts
4.8s    Typing ends
5.2s    Cursor moves to submit
5.8s    Click
6.2s    Modal closes
6.5s    New item appears
7.2s    Success state
8.5s    Pause
9.5s    Reset
```

Adjust these timings based on the actual workflow.

Do not make it too fast.

Users need to understand what is happening.

---

# 13. Reset / Replay

The workflow should automatically replay.

After completing:

```text
Complete
   ↓
Pause
   ↓
Reset state
   ↓
Play again
```

The reset should be smooth.

Do not abruptly reload the page.

Reset React state instead.

---

# 14. Landing Page Integration

Find the existing landing page.

Place the workflow demo in the most appropriate section.

Preferably:

```text
Hero
  ↓
Product/workflow demo
  ↓
Features
  ↓
Other sections
```

or integrate it directly into the hero if that matches the existing design.

Do not destroy the existing landing-page layout.

Preserve:

* existing typography
* spacing
* responsive behavior
* theme
* sections
* copy
* navigation
* buttons

Only add the demo where appropriate.

---

# 15. Visual Presentation

Wrap the dashboard in a premium product-demo container.

Potential structure:

```tsx
<div className="relative overflow-hidden rounded-2xl border shadow-xl">
  <DashboardWorkflow />
</div>
```

Use the actual application's border/shadow tokens.

Potential additions:

* subtle browser chrome
* subtle gradient glow
* tiny top bar
* subtle backdrop
* soft shadow
* very light perspective
* subtle cursor label

But do NOT over-design it.

The actual dashboard should remain the visual focus.

---

# 16. Don't Fake Colors

This is a strict requirement.

Do NOT write things like:

```tsx
bg-blue-500
bg-purple-500
text-gray-900
```

unless those exact colors are already used by the application.

Instead use:

```tsx
bg-background
text-foreground
bg-primary
text-primary-foreground
border-border
bg-muted
text-muted-foreground
```

or the project's existing design tokens.

If the dashboard has custom colors, reuse those exact classes/tokens.

---

# 17. Responsive Behavior

The demo must work on:

* desktop
* tablet
* mobile

On smaller screens:

* simplify the sidebar if necessary
* reduce padding
* hide non-essential dashboard areas
* preserve the main workflow
* keep cursor coordinates responsive

Do not allow horizontal overflow.

The workflow should remain understandable on mobile.

---

# 18. Performance

Do not create an animation that causes unnecessary React re-renders.

Prefer:

* Motion transforms
* CSS transforms
* opacity
* AnimatePresence
* local state only where necessary

Avoid:

* expensive intervals
* hundreds of state updates
* unnecessary global state
* DOM querying on every frame

The landing page should remain fast.

---

# 19. Accessibility

Even though this is a demo, maintain good accessibility.

Use:

* semantic HTML
* real buttons
* real inputs
* labels
* accessible text

The animated cursor should be:

```tsx
aria-hidden="true"
```

because it is decorative.

The workflow should not interfere with the rest of the page.

---

# 20. Do Not Make the Demo Interactive Unless Useful

The primary purpose is an **automated product walkthrough**.

It should autoplay.

If adding a manual replay control improves the experience, add a subtle:

```text
Replay
```

button.

But don't make the user manually operate the demo just to see it.

---

# 21. Important Implementation Rule

Do NOT immediately start coding.

First:

1. Inspect the repository.
2. Identify the dashboard architecture.
3. Identify reusable components.
4. Identify the design tokens.
5. Identify the most visually interesting workflow.
6. Decide which dashboard UI can be reused.
7. Then implement the demo.

Before finishing, verify that the demo visually belongs to the existing application.

---

# 22. Final Quality Standard

The final result should look like something found on a polished modern SaaS landing page.

It should give the impression of:

> "This is a real recording of someone using the product."

But underneath it should actually be:

```text
React
+
Real DOM
+
Existing dashboard components
+
Existing design system
+
Motion animations
+
React state
+
Animated cursor
+
Automated workflow
```

NOT:

```text
MP4
GIF
Screenshot
Canvas recording
Static mockup
```

The viewer should be able to select text inside the demo.

The dashboard should use the **actual visual language of my SaaS**.

The workflow should be believable, smooth, and complete.

Most importantly:

**Analyze my existing dashboard and build the demo around what the product actually does. Do not invent a generic SaaS dashboard.**
