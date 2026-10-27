import React from 'react';

interface Props {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Authentic Google Meet 4-color Vector Camera Icon
 * Complies with Google Meet brand guidelines (Green, Blue, Yellow, Red facets)
 */
export const GoogleMeetIcon: React.FC<Props> = ({ size = 18, className, style }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 87.5 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-label="Google Meet"
    >
      {/* Blue body left */}
      <path
        d="M0 55.5V16.5C0 11.2533 4.25329 7 9.5 7H43.5C48.7467 7 53 11.2533 53 16.5V55.5C53 60.7467 48.7467 65 43.5 65H9.5C4.25329 65 0 60.7467 0 55.5Z"
        fill="#00832d"
      />
      {/* Green front face */}
      <path
        d="M0 16.5C0 11.2533 4.25329 7 9.5 7H43.5C48.7467 7 53 11.2533 53 16.5V36H0V16.5Z"
        fill="#00ac47"
      />
      {/* Dark green bottom corner */}
      <path
        d="M0 55.5V36H53V55.5C53 60.7467 48.7467 65 43.5 65H9.5C4.25329 65 0 60.7467 0 55.5Z"
        fill="#006622"
      />
      {/* Yellow camera top lens flap */}
      <path
        d="M53 23L72.2 8.6C73.8 7.4 76 8.5 76 10.5V23H53Z"
        fill="#ffba00"
      />
      {/* Red camera bottom lens flap */}
      <path
        d="M53 49V61.5C53 63.5 55.2 64.6 56.8 63.4L76 49H53Z"
        fill="#ea4335"
      />
      {/* Blue camera middle lens prism */}
      <path
        d="M53 23H82C85.0376 23 87.5 25.4624 87.5 28.5V43.5C87.5 46.5376 85.0376 49 82 49H53V23Z"
        fill="#2684fc"
      />
      {/* Right trapezoid camera cone */}
      <path
        d="M53 23L76 8.6V63.4L53 49V23Z"
        fill="#1a73e8"
      />
    </svg>
  );
};
