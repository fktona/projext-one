import React from "react";

const PluginIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={16}
    height={17}
    viewBox="0 0 16 17"
    fill="none"
    {...props}
  >
    <path
      d="M6.99992 13.7666L6.99992 3.23325C6.99992 2.23325 6.57325 1.83325 5.51325 1.83325L2.81992 1.83325C1.75992 1.83325 1.33325 2.23325 1.33325 3.23325L1.33325 13.7666C1.33325 14.7666 1.75992 15.1666 2.81992 15.1666H5.51325C6.57325 15.1666 6.99992 14.7666 6.99992 13.7666Z"
      stroke="white"
      strokeWidth={0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.6667 6.17992V3.15325C14.6667 2.21325 14.24 1.83325 13.18 1.83325L10.4867 1.83325C9.42667 1.83325 9 2.21325 9 3.15325V6.17325C9 7.11992 9.42667 7.49325 10.4867 7.49325L13.18 7.49325C14.24 7.49992 14.6667 7.11992 14.6667 6.17992Z"
      stroke="white"
      strokeWidth={0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14.6667 13.68V10.9867C14.6667 9.92667 14.24 9.5 13.18 9.5H10.4867C9.42667 9.5 9 9.92667 9 10.9867V13.68C9 14.74 9.42667 15.1667 10.4867 15.1667H13.18C14.24 15.1667 14.6667 14.74 14.6667 13.68Z"
      stroke="white"
      strokeWidth={0.9}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default PluginIcon;
