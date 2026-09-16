/** What the views need about one image. No XP imports: this file is shared with the browser. */
export type ImageItem = {
  url: string;
  alt: string;
  width: number;
  height: number;
  /** PNG data URI from the stored BlurHash, or null: no hash, invalid hash, or `withHash` false. */
  placeholder: string | null;
  /** `#rrggbb` average colour from the hash, or null on the same conditions as `placeholder`. */
  color: string | null;
};
