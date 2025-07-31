export default function DownArrowIcon({
  className,
  height,
  width,
}: {
  className?: string;
  height?: number;
  width?: number;
}) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width || 16}
      height={height || 17}
      viewBox="0 0 16 17"
      fill="none"
      className={className}
    >
      <path
        d="M7.99967 15.1666C11.6816 15.1666 14.6663 12.1818 14.6663 8.49992C14.6663 4.81802 11.6816 1.83325 7.99967 1.83325C4.31778 1.83325 1.33301 4.81802 1.33301 8.49992C1.33301 12.1818 4.31778 15.1666 7.99967 15.1666Z"
        stroke="white"
        strokeWidth="0.9"
        strokeMiterlimit="10"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.64648 7.65991L7.99982 10.0066L10.3532 7.65991"
        stroke="white"
        strokeWidth="0.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
