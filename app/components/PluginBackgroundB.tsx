export default function PluginBackgroundB() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="668"
      height="1045"
      viewBox="0 0 668 1045"
      fill="none"
    >
      <g filter="url(#filter0_dfn_35_4413)">
        <rect
          x="6"
          y="4"
          width="652"
          height="1551"
          rx="32"
          fill="black"
          fillOpacity="0.9"
          shapeRendering="crispEdges"
        />
        <rect
          x="6.25"
          y="4.25"
          width="651.5"
          height="1550.5"
          rx="31.75"
          stroke="url(#paint0_linear_35_4413)"
          strokeWidth="0.5"
          shapeRendering="crispEdges"
        />
      </g>
      <defs>
        <filter
          id="filter0_dfn_35_4413"
          x="0"
          y="-2"
          width="668"
          height="1569"
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
            result="effect1_dropShadow_35_4413"
          />
          <feBlend
            mode="normal"
            in="SourceGraphic"
            in2="effect1_dropShadow_35_4413"
            result="shape"
          />
          <feGaussianBlur
            stdDeviation="0.1"
            result="effect2_foregroundBlur_35_4413"
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
            in2="effect2_foregroundBlur_35_4413"
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
          <feMerge result="effect3_noise_35_4413">
            <feMergeNode in="effect2_foregroundBlur_35_4413" />
            <feMergeNode in="color1" />
          </feMerge>
        </filter>
        <linearGradient
          id="paint0_linear_35_4413"
          x1="5.99998"
          y1="399.829"
          x2="647.262"
          y2="421.548"
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
