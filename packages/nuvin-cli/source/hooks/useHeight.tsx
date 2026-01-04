import { type BoxRef, measureElement } from 'ink';
import { useLayoutEffect, useState } from 'react';

export const useMeasureHeight = (ref: React.RefObject<BoxRef | null>) => {
  const [height, setHeight] = useState(0);

  useLayoutEffect(() => {
    if (ref.current) {
      const { height: measuredHeight } = measureElement(ref.current);
      if (measuredHeight > 0 && measuredHeight !== height) {
        setHeight(measuredHeight);
      }
    }
  });

  return { height };
};
