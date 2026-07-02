import { WallPainter } from '@/components/wall-painter';

/* Full-bleed AR camera. All logic lives in WallPainter (with a .web.tsx
   fallback for the browser preview). */
export default function ARScreen() {
  return <WallPainter />;
}
