import { useEffect, useRef, useState } from 'react';

export type RevealImageProps = {
  src: string;
  alt: string;
  width: number;
  height: number;
  style?: React.CSSProperties;
};

/**
 * An <img> hidden until fully *decoded*, then faded in. Neither the network's progressive paint
 * nor the decoder's top-to-bottom paint of a cached image ever shows over what sits behind it.
 * `load` (and `complete`) fire before decoding is done, hence `decode()`. The effect covers
 * images already complete before hydration, when React's onLoad never fires.
 */
export function RevealImage({ src, alt, width, height, style }: RevealImageProps) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const reveal = () => {
    const img = ref.current;
    if (!img) return;
    const show = () => setLoaded(true);
    if (typeof img.decode === 'function') img.decode().then(show, show);
    else show();
  };

  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) reveal();
  }, []);

  return (
    <img
      ref={ref}
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      onLoad={reveal}
      style={{
        display: 'block',
        width: '100%',
        height: 'auto',
        opacity: loaded ? 1 : 0,
        transition: 'opacity 0.5s ease-out',
        ...style,
      }}
    />
  );
}
