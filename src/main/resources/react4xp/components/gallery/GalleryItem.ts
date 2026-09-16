/** Shape shared by the processors (server) and the <Gallery> view (server + browser). */
export type GalleryItem = {
  url: string;
  alt: string;
  width: number;
  height: number;
  /** PNG data URI from the stored BlurHash, or null: no hash, invalid hash, or the simple gallery. */
  placeholder: string | null;
};
