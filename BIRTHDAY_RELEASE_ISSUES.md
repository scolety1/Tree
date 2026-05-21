# Birthday Release Issues

This is the running issue list for the last polish stretch before the birthday demo. Keep this focused on things that affect confidence, usability, or the first impression.

## Navigation and Account IA

Status: Done locally, needs user visual review.

- Done locally: Convert `Dashboard` into an `Account` page.
- Done locally: Remove `Dashboard` from the main navigation.
- Done locally: Use a small account/silhouette control in the top right, similar to Porkbun's account affordance.
- Done locally: Signed-in navigation should be simpler: `Family Tree`, `Search`, and the account control.
- Done locally: Signed-out/public navigation should keep a clear landing path, example tree path, search path, and sign-in path.
- Done locally: Move signed-in email and sign-out controls out of the center/header nav area so the header feels intentional.
- Done locally: Keep `Home` as a landing page, especially for guests or people who have not signed in yet.
- Verified locally: Browser-smoked public routes and the account route with no Dashboard nav and no obvious runtime errors.

## Tree Discovery and Account State

Status: Done locally, needs Firebase/live user review.

- Done locally: Fix the case where an existing account already owns or belongs to a family tree but the dashboard/account page says there are no trees.
- Done locally: Continue supporting legacy tree documents that may be missing `memberIds` or role fields.
- Done locally: If a legacy tree can be safely repaired when the owner signs in, add the missing membership fields automatically.
- Done locally: Generate a missing access code for legacy owned trees when the owner opens Account.
- Done locally: Rename dashboard copy away from `Your Family Trees`; most users will only have one primary family tree.
- Needs live review: Sign in with the real Firebase account and confirm the existing family tree appears on Account.

## Person Editing

Status: Done locally, needs Firebase/live private-tree review.

- Done locally: Make it obvious when a person profile can be edited.
- Done locally: Add a clear edit path from a person profile for private family-tree records.
- Done locally: Show a clear read-only state for example/demo profiles.
- Verified locally: Preserve `familyId` when moving between tree cards, profiles, and back links so edit controls can appear reliably.
- Done locally: Make add/edit/remove behavior feel consistent and safe for the birthday demo.
- Needs live review: Open a real private-tree profile while signed in and confirm the edit/remove buttons appear.

## Tree Layout and Large Families

Status: Done locally, needs visual review on the deployed large demo.

- Done locally: The large demo tree proves the layout can render many people, but the horizontal canvas gets hard to scan.
- Done locally: Add better large-tree controls or presentation options, such as comfortable, dense, and compact modes.
- Done locally: Improve scroll orientation with sticky generation labels and a clear sideways-scroll hint.
- Done locally: Review connector lines in large trees so they do not feel visually chopped or confusing.
- Done locally: Keep the default birthday-demo tree polished before spending time on advanced large-tree behavior.
- Needs review: Open `/tree?demo=large` and compare Comfortable, Dense, and Compact modes.

## Visual Polish

Status: Done locally, needs user visual review.

- Done locally: The two-square logo mark is now the app mark and should stay visible in the header and favicon.
- Done locally: Re-check header spacing after the account navigation cleanup.
- Done locally: Keep the green and cream visual direction, but avoid cramped controls or oversized empty space.
- Done locally: Continue mobile smoke checks after layout changes.
- Needs review: Look at the deployed header signed in and signed out on desktop and phone-sized widths.

## Release Control

Status: Done locally, needs final owner review before commit/push/deploy.

- Done locally: Do not make the Porkbun/domain transfer the blocker until app polish is complete.
- Done locally: Keep domain transfer as the final release step.
- Done locally: Do not push new UI changes until they have been checked locally and reviewed, unless explicitly requested.
- Done locally: Update deployment docs so `/account` is the primary account route and `/dashboard` is compatibility only.
- Done locally: Document the final release order: local checks, review, push, GitHub Actions, Firebase deploy, Firebase URL smoke, then Porkbun/domain.
