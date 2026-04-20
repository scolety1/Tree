# Family Tree Website Roadmap

This roadmap is aimed at turning the current family tree app into a production-quality website: reliable enough for real families, polished enough to feel professional, and structured well enough that it could support paid use later if desired.

## Phase 1: Stabilize The Current App

- Finish a live Firebase QA pass.
  - Create account with email/password.
  - Sign in with Google.
  - Create a family tree.
  - Join a family tree with another account.
  - Add, edit, and remove people.
  - Upload and replace profile images.
  - Reset invite codes.
  - Remove members.
  - Archive a tree.
- Replace remaining `alert()` and `confirm()` flows with in-page messages and modal confirmations.
- Add consistent empty, loading, and error states across home, dashboard, tree, search, and profile pages.
- Confirm mobile layout works well for dashboard cards, profile pages, modals, and wide tree views.
- Add a browser QA checklist before every deploy.

## Phase 2: Authentication, Privacy, And Rules

- Enable Firebase Auth providers in Firebase Console.
  - Email/password.
  - Google sign-in.
- Deploy and test Firestore rules.
- Deploy and test Storage rules.
- Decide what guest access should support.
  - Public read-only example tree.
  - No guest-created private trees.
  - No guest editing.
- Tighten rules around roles.
  - Owner can manage tree settings, invites, members, and archive.
  - Editor can add/edit people.
  - Viewer can only browse.
- Add a simple account page.
  - Current email/name.
  - Sign out.
  - Delete account request path later.

## Phase 3: Data Model Migration

- Create a migration tool for old relationship data.
  - Convert `parent1` and `parent2` name strings to `parentIds`.
  - Convert spouse name fields to `spouseIds`.
  - Report ambiguous name matches.
  - Report unresolved relationships for manual review.
- Preserve legacy fields temporarily for backward compatibility.
- After migration, make ID-backed relationships the main source of truth.
- Add data validation helpers.
  - No duplicate parent IDs.
  - No self-parent relationships.
  - No self-spouse relationships.
  - No duplicate person records with the same name unless intentionally allowed.

## Phase 4: Better Tree Building UX

- Add contextual relationship actions from profiles.
  - Add Parent.
  - Add Child.
  - Add Spouse/Partner.
  - Add Sibling.
- Prefill relationship IDs automatically based on where the action starts.
- Add a relationship editor.
  - Add/remove parents.
  - Add/remove spouse or partner.
  - Support multiple spouses/partners.
  - Mark relationship status later if needed.
- Add richer person fields.
  - Birth date.
  - Death date.
  - Birthplace.
  - Bio/story.
  - Notes.
  - Photo.
- Replace generic add-person form with a guided flow.

## Phase 5: Safer Delete, Archive, And Restore

- Change person deletion to soft delete.
  - `deletedAt`.
  - `deletedBy`.
  - Hide deleted people from tree/search.
  - Add restore support.
- Add archived tree management.
  - Archived trees section on dashboard.
  - Restore tree.
  - Permanently delete only after explicit confirmation.
- Avoid orphaning people and photos.
- Add audit fields to important changes.
  - `updatedAt`.
  - `updatedBy`.
  - `createdBy`.

## Phase 6: Member And Invite Management

- Improve dashboard members panel.
  - Show display name and email where available.
  - Show role.
  - Show invite/join date if tracked.
- Add owner controls.
  - Change member role.
  - Remove member.
  - Reset invite code.
  - Disable invite code.
- Add expiring invites later.
- Add invite links.
  - Example: `/join?code=ABC123`.
- Add join request flow if a family wants approval before adding members.

## Phase 7: Profile Photos And Media

- Add image preview before upload.
- Add image size/type validation before upload.
- Compress large images before uploading.
- Allow removing a profile image.
- Clean up old Storage images after replacement.
- Store images under family-scoped paths.
- Consider galleries later.
  - Profile photos.
  - Family photos.
  - Documents.

## Phase 8: Tree Visualization Polish

- Add zoom and pan for large trees.
- Add fit-to-screen.
- Add center-on-person.
- Add focus modes.
  - Immediate family.
  - Ancestors.
  - Descendants.
  - Full tree.
- Improve handling of complex relationships.
  - Multiple spouses.
  - Divorces/separations.
  - Step-parents.
  - Adoptive parents.
- Improve connector line stability on resize and scroll.
- Add print-friendly tree view.

## Phase 9: Search, Filtering, And Discovery

- Improve search beyond simple name matching.
  - Search by full name.
  - Search by maiden/alternate names later.
  - Search by birth year.
  - Search by bio text.
- Add filters.
  - People with missing birthdays.
  - People with no photo.
  - People with incomplete relationships.
- Add dashboard prompts for incomplete data.

## Phase 10: Export, Backup, And Data Ownership

- Add export tools.
  - JSON backup.
  - CSV people list.
  - PDF or image tree export.
- Add import tools.
  - CSV import first.
  - GEDCOM import/export later.
- Add owner-triggered backup download.
- Add scheduled Firestore export outside the client app.
- Clearly state that families own their data.

## Phase 11: Deployment And Custom Domain

- Choose the production hosting setup.
  - Vercel is already configured and is a good fit for this static app plus serverless API.
  - Firebase Hosting is another option if you want everything inside Firebase.
- Pick and buy a realistic domain.
  - `tree.com` is likely unavailable or extremely expensive.
  - Better options might be names like `familytreeapp.com`, `familybranch.app`, `ourfamilytree.app`, `branchbook.app`, or a personal family domain.
- Configure DNS.
  - Add the domain to Vercel.
  - Point DNS records from the registrar to Vercel.
  - Confirm HTTPS certificate is active.
- Set production Firebase settings.
  - Add the custom domain to Firebase Auth authorized domains.
  - Add Vercel preview/production domains as needed.
  - Confirm Google sign-in redirect works on the custom domain.
- Create separate environments if needed.
  - Development Firebase project.
  - Production Firebase project.
- Add a release checklist.
  - Run syntax checks.
  - Test auth.
  - Test dashboard.
  - Test tree creation/join.
  - Test image upload.
  - Test rules.
  - Deploy.

## Phase 12: Product Polish

- Create a public landing page separate from the app dashboard.
- Add onboarding after account creation.
  - Create first tree.
  - Add yourself.
  - Add parents.
  - Invite family.
- Add privacy policy and terms before public launch.
- Add basic analytics with privacy in mind.
- Add error monitoring.
- Add support/contact path.

## Current Recommended Next Steps

1. Run a full live Firebase QA pass.
2. Enable and test Auth providers in Firebase Console.
3. Deploy rules to a test Firebase project first.
4. Build the relationship migration tool.
5. Add contextual Add Parent/Add Child/Add Spouse flows.
6. Add archived tree restore.
7. Set up a production domain on Vercel.

