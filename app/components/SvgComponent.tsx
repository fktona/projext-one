export default function SvgComponent() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="868"
      height="157"
      viewBox="0 0 868 157"
      fill="none"
      className="relative"
    >
      <g filter="url(#filter0_dfn_35_2275)">
        <rect
          x="6.79858"
          y="4"
          width="851"
          height="141"
          rx="24"
          fill="#DDDDDD"
          fillOpacity="0.05"
          shapeRendering="crispEdges"
        />
        <rect
          x="7.46358"
          y="4.665"
          width="849.67"
          height="139.67"
          rx="23.335"
          stroke="url(#paint0_linear_35_2275)"
          strokeWidth="1.33"
          shapeRendering="crispEdges"
        />
        {/* <path d="M27.0986 115.5V69.5H30.5986V115.5H27.0986Z" fill="#BFBBFF" /> */}
      </g>
      <defs>
        <filter
          id="filter0_dfn_35_2275"
          x="0.798584"
          y="-2"
          width="867"
          height="159"
          filterUnits="userSpaceOnUse"
          colorInterpolationFilters="sRGB"
        >
          <feFlood floodOpacity="0" result="BackgroundImageFix" />
          <feColorMatrix
            in="SourceAlpha"
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
            result="hardAlpha"
          />
          <feOffset dx="2" dy="4" />
          <feGaussianBlur stdDeviation="4" />
          <feComposite in2="hardAlpha" operator="out" />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.08 0"
          />
          <feBlend
            mode="normal"
            in2="BackgroundImageFix"
            result="effect1_dropShadow_35_2275"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_35_2275"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="0.1"
            result="effect2_foregroundBlur_35_2275"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="2 2"
            stitchTiles="stitch"
            numOctaves="3"
            result="noise"
            seed="6719"
          />
          <feColorMatrix
            in="noise"
            type="luminanceToAlpha"
            result="alphaNoise"
          />
          <feComponentTransfer in="alphaNoise" result="coloredNoise1">
            <feFuncA
              type="discrete"
              tableValues="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 "
            />
          </feComponentTransfer>
          <feComposite
            operator="in"
            in2="effect2_foregroundBlur_35_2275"
            in="coloredNoise1"
            result="noise1Clipped"
          />
          <feFlood
            floodColor="rgba(255, 255, 255, 0.16)"
            result="color1Flood"
          />
          <feComposite
            operator="in"
            in2="noise1Clipped"
            in="color1Flood"
            result="color1"
          />
          <feMerge result="effect3_noise_35_2275">
            <feMergeNode in="effect2_foregroundBlur_35_2275" />
            <feMergeNode in="color1" />
          </feMerge>
        </filter>
        <linearGradient
          id="paint0_linear_35_2275"
          x1="6.79856"
          y1="39.9844"
          x2="684.492"
          y2="369.532"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="white" stopOpacity="0" />
          <stop offset="0.3" stopColor="white" stopOpacity="0.6" />
          <stop offset="0.404849" stopColor="white" stopOpacity="0" />
          <stop offset="0.60121" stopColor="white" stopOpacity="0" />
          <stop offset="0.84911" stopColor="white" stopOpacity="0.6" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}
