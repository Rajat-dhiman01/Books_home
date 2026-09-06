// Shared visual branding constants — used wherever the app needs the same
// hero imagery/gradient treatment (currently Dashboard's hero banner and the
// desktop Sidebar's footer panel). Keeping this in one place means both
// surfaces stay visually consistent by construction, not by duplicated
// copy-pasted strings.

// Photo by Ahmet Yuksek on Unsplash, free to use under the Unsplash License.
export const HERO_IMAGE_URL =
  'https://images.unsplash.com/photo-1755918909925-f62b86d93c2a?fm=jpg&q=60&w=2400&auto=format&fit=crop'

// Same dark gradient overlay used on Dashboard's hero, exposed as a helper so
// any surface using HERO_IMAGE_URL renders it with identical contrast/legibility.
export function heroBackgroundStyle(imageUrl: string = HERO_IMAGE_URL) {
  return {
    backgroundImage: `linear-gradient(to bottom, rgba(8,9,11,0.55), rgba(8,9,11,0.92)), url(${imageUrl})`,
  }
}